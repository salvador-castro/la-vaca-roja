import { NextRequest } from "next/server";
import {
  corsResponse, corsError, handleOptions,
  createApiClient, getAuthUser,
} from "@/utils/supabase/api";

export async function OPTIONS() { return handleOptions(); }

/**
 * POST /api/coupons/validate
 * Body: { code: string, subtotal: number }
 * Valida el cupón sin incrementar el uso — el uso se incrementa al crear la orden.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return corsError("Debe estar autenticado para usar cupones", 401);

  const { code, subtotal } = await req.json();
  if (!code) return corsError("Código de cupón requerido", 400);

  const supabase = createApiClient(req);

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("active", true)
    .single();

  if (error || !coupon) return corsError("Cupón inválido o inactivo", 404);

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return corsError("Este cupón ya venció", 400);
  }

  if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
    return corsError("Este cupón ya alcanzó su límite de usos", 400);
  }

  if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
    return corsError(
      `Compra mínima de $${coupon.min_order_amount} requerida`,
      400
    );
  }

  const discount =
    coupon.discount_type === "percentage"
      ? (subtotal * coupon.discount_value) / 100
      : Math.min(coupon.discount_value, subtotal);

  return corsResponse({
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
    },
    discount,
    total_after: subtotal - discount,
  });
}
