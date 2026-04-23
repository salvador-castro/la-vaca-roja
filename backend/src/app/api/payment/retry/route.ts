import { NextRequest } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import {
  corsResponse,
  corsError,
  handleOptions,
  createApiClient,
  getAuthUser,
} from "@/utils/supabase/api";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function OPTIONS() {
  return handleOptions();
}

/* POST /api/payment/retry — genera un nuevo link de pago para una orden pendiente existente */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return corsError("Debe estar autenticado para comprar", 401);

  const { order_id } = await req.json();
  if (!order_id) return corsError("order_id requerido", 400);

  const supabase = createApiClient(req);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", order_id)
    .single();

  if (orderError || !order) return corsError("Pedido no encontrado", 404);
  if (order.user_id !== user.id) return corsError("Acceso denegado", 403);
  if (order.status !== "pending") return corsError("Solo se puede reintentar el pago de pedidos pendientes", 400);

  const items = order.order_items as {
    product_id: number;
    product_name: string;
    variant_name?: string;
    quantity: number;
    unit_price: number;
  }[];

  const mpItems = items.map((item) => ({
    id: String(item.product_id),
    title: item.variant_name
      ? `${item.product_name} (${item.variant_name})`
      : item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency_id: "ARS",
  }));

  const shipping = order.total - order.subtotal + order.coupon_discount;
  if (shipping > 0) {
    mpItems.push({ id: "shipping", title: "Envío", quantity: 1, unit_price: shipping, currency_id: "ARS" });
  }

  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const backendUrl = process.env.BACKEND_PUBLIC_URL ?? "http://localhost:3000";

  const preference = new Preference(mp);
  const result = await preference.create({
    body: {
      items: mpItems,
      back_urls: {
        success: `${frontendUrl}/pago/exitoso`,
        failure: `${frontendUrl}/pago/fallido`,
        pending: `${frontendUrl}/pago/pendiente`,
      },
      auto_return: "approved",
      external_reference: String(order.id),
      notification_url: `${backendUrl}/api/payment/webhook`,
    },
  });

  return corsResponse({
    init_point: result.init_point,
    sandbox_init_point: result.sandbox_init_point,
    order_id: order.id,
  });
}
