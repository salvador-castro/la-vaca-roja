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

type CartItem = {
  product_id: number;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return corsError("Debe estar autenticado para comprar", 401);

  const body = await req.json();
  const { items, coupon_id, notes, shipping } = body as {
    items: CartItem[];
    coupon_id?: number;
    notes?: string;
    shipping: number;
  };

  if (!items?.length) return corsError("El carrito está vacío", 400);

  const supabase = createApiClient(req);

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const shippingCost = shipping ?? 0;

  let couponDiscount = 0;
  let coupon = null;

  if (coupon_id) {
    const { data: c } = await supabase
      .from("coupons")
      .select("*")
      .eq("id", coupon_id)
      .eq("active", true)
      .single();

    if (c) {
      coupon = c;
      couponDiscount =
        c.discount_type === "percentage"
          ? (subtotal * c.discount_value) / 100
          : Math.min(c.discount_value, subtotal);
    }
  }

  const total = subtotal - couponDiscount + shippingCost;

  // Crear orden en Supabase
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      subtotal,
      coupon_id: coupon?.id ?? null,
      coupon_discount: couponDiscount,
      total,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (orderError) return corsError(orderError.message, 500);

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(items.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    return corsError("Error al guardar los productos del pedido", 500);
  }

  if (coupon) {
    await supabase
      .from("coupons")
      .update({ uses_count: (coupon.uses_count ?? 0) + 1 })
      .eq("id", coupon.id);
  }

  // Armar preferencia de MP
  const mpItems = [
    ...items.map((item) => ({
      id: String(item.product_id),
      title: item.variant_name
        ? `${item.product_name} (${item.variant_name})`
        : item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency_id: "ARS",
    })),
    ...(shippingCost > 0
      ? [{ id: "shipping", title: "Envío", quantity: 1, unit_price: shippingCost, currency_id: "ARS" }]
      : []),
  ];

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

  return corsResponse(
    {
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      order_id: order.id,
    },
    201
  );
}
