import { NextRequest } from "next/server";
import {
  corsResponse, corsError, handleOptions,
  createApiClient, getAuthUser,
} from "@/utils/supabase/api";

export async function OPTIONS() { return handleOptions(); }

/* GET /api/orders — admin: todos | cliente: los propios */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return corsError("No autorizado", 401);

  const supabase = createApiClient(req);
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const isAdmin = profile?.role === "admin";

  if (isAdmin) {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) return corsError(error.message, 500);

    // Attach profile data manually (no direct FK between orders and profiles)
    const userIds = [...new Set((orders ?? []).map((o) => o.user_id as string))];
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name, email").in("id", userIds);

    const profileMap: Record<string, { id: string; full_name: string; email: string }> = {};
    (profiles ?? []).forEach((p) => { profileMap[p.id] = p; });

    const data = (orders ?? []).map((o) => ({ ...o, profiles: profileMap[o.user_id] ?? null }));
    return corsResponse(data);
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return corsError(error.message, 500);

  const { data: ownProfile } = await supabase
    .from("profiles").select("id, full_name, email").eq("id", user.id).single();

  return corsResponse((data ?? []).map((o) => ({ ...o, profiles: ownProfile ?? null })));
}

/**
 * POST /api/orders — crear pedido
 * Body: {
 *   items: [{ product_id, product_name, variant_name?, quantity, unit_price, line_total }]
 *   coupon_id?: number
 *   notes?: string
 * }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return corsError("Debe estar autenticado para comprar", 401);

  const body = await req.json();
  const { items, coupon_id, notes } = body;

  if (!items?.length) return corsError("El carrito está vacío", 400);

  const supabase = createApiClient(req);

  // Calcular totales
  const subtotal: number = items.reduce(
    (sum: number, item: { line_total: number }) => sum + item.line_total,
    0
  );

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

  const total = subtotal - couponDiscount;

  // Crear la orden
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      subtotal,
      coupon_id: coupon?.id || null,
      coupon_discount: couponDiscount,
      total,
      notes: notes || null,
    })
    .select()
    .single();

  if (orderError) return corsError(orderError.message, 500);

  // Insertar ítems
  const orderItems = items.map((item: Record<string, unknown>) => ({
    ...item,
    order_id: order.id,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    // Rollback: eliminar la orden si los ítems fallan
    await supabase.from("orders").delete().eq("id", order.id);
    return corsError("Error al guardar los productos del pedido", 500);
  }

  // Incrementar uso del cupón
  if (coupon) {
    await supabase
      .from("coupons")
      .update({ uses_count: (coupon.uses_count || 0) + 1 })
      .eq("id", coupon.id);
  }

  return corsResponse({ ...order, order_items: orderItems }, 201);
}
