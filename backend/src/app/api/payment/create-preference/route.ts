import { NextRequest } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import {
  corsResponse,
  corsError,
  handleOptions,
  createApiClient,
  getAuthUser,
} from "@/utils/supabase/api";
import { resolveZoneFromAddress, type Zone } from "@/utils/shipping";

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

type PaymentMethod = "mercadopago" | "transferencia";
type DeliveryMethod = "pickup" | "delivery";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return corsError("Debe estar autenticado para comprar", 401);

  const body = await req.json();
  const { items, coupon_id, notes, delivery_method, payment_method } = body as {
    items: CartItem[];
    coupon_id?: number;
    notes?: string;
    delivery_method: DeliveryMethod;
    payment_method: PaymentMethod;
  };

  if (!items?.length) return corsError("El carrito está vacío", 400);
  if (!["pickup", "delivery"].includes(delivery_method))
    return corsError("Método de entrega inválido", 400);
  if (!["mercadopago", "transferencia"].includes(payment_method))
    return corsError("Método de pago inválido", 400);

  const supabase = createApiClient(req);

  let zone: Zone = "pickup";
  if (delivery_method === "delivery") {
    const { data: profile } = await supabase
      .from("profiles").select("address").eq("id", user.id).single();

    if (!profile?.address?.trim()) return corsError("No tenés una dirección guardada", 400);

    const zoneResult = await resolveZoneFromAddress(profile.address);
    if ("error" in zoneResult) return corsError(zoneResult.error, 400);
    zone = zoneResult.zone;
  }

  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value");
  const settings: Record<string, string> = {};
  (settingsRows ?? []).forEach((s) => { settings[s.key] = s.value; });

  const freeShippingMin = Number(settings.free_shipping_min ?? 90000);
  const transferPercent = Number(settings.transfer_discount_percent ?? 10);
  const zoneCosts: Record<Zone, number> = {
    pickup: 0,
    zone_1_3: Number(settings.shipping_zone_1_3 ?? 3500),
    zone_3_5: Number(settings.shipping_zone_3_5 ?? 4500),
    zone_5_10: Number(settings.shipping_zone_5_10 ?? 6000),
  };

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

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

  const subtotalConCupon = subtotal - couponDiscount;
  const transferDiscount =
    payment_method === "transferencia" ? subtotalConCupon * (transferPercent / 100) : 0;
  const montoConDescuento = subtotalConCupon - transferDiscount;
  const shippingCost =
    zone === "pickup" ? 0 : montoConDescuento >= freeShippingMin ? 0 : zoneCosts[zone];
  const total = montoConDescuento + shippingCost;

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
      delivery_method,
      payment_method,
      transfer_discount: transferDiscount,
      shipping_cost: shippingCost,
      shipping_zone: zone,
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

  if (payment_method === "transferencia") {
    return corsResponse(
      { order_id: order.id, payment_method: "transferencia", total },
      201
    );
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
      payment_method: "mercadopago",
    },
    201
  );
}
