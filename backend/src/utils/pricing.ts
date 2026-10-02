import type { SupabaseClient } from "@supabase/supabase-js";

/* Lo único que se acepta del navegador por ítem: qué producto, qué variante y cuánto */
export type CartItemInput = {
  product_id: number;
  variant_name?: string | null;
  quantity: number;
};

export type PricedItem = {
  product_id: number;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Coupon = {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  uses_count: number | null;
  expires_at: string | null;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/* Precio vigente: sale_price si la promo está activa, igual que CartContext en el front */
function effectivePrice(p: {
  price: number;
  sale_price: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
}) {
  const now = new Date();
  const promoActive =
    p.sale_price != null &&
    (!p.promo_starts_at || new Date(p.promo_starts_at) <= now) &&
    (!p.promo_ends_at || new Date(p.promo_ends_at) >= now);
  return Number(promoActive ? p.sale_price : p.price);
}

/* Recalcula nombre y precios de cada ítem con los datos de la base, ignorando lo que mande el cliente */
export async function priceCartItems(
  supabase: SupabaseClient,
  items: CartItemInput[]
): Promise<Result<PricedItem[]>> {
  if (!Array.isArray(items) || !items.length) return { ok: false, error: "El carrito está vacío" };

  for (const item of items) {
    const qty = Number(item?.quantity);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 1000) {
      return { ok: false, error: "Cantidad inválida en el carrito" };
    }
  }

  const ids = [...new Set(items.map((i) => Number(i.product_id)))];
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, sale_price, promo_starts_at, promo_ends_at, active, has_variants, product_variants(name, active)")
    .in("id", ids);

  if (error) return { ok: false, error: "No pudimos verificar los productos del carrito" };

  const byId = new Map((products ?? []).map((p) => [p.id as number, p]));
  const priced: PricedItem[] = [];

  for (const item of items) {
    const product = byId.get(Number(item.product_id));
    if (!product || !product.active) {
      return { ok: false, error: "Un producto del carrito ya no está disponible" };
    }

    const variantName = item.variant_name?.trim() || null;
    if (variantName) {
      const variants = (product.product_variants ?? []) as { name: string; active: boolean | null }[];
      const variant = variants.find((v) => v.name === variantName && v.active !== false);
      if (!variant) {
        return { ok: false, error: `La variante "${variantName}" de ${product.name} ya no está disponible` };
      }
    }

    const quantity = Number(item.quantity);
    const unitPrice = effectivePrice(product);
    priced.push({
      product_id: product.id,
      product_name: product.name,
      variant_name: variantName,
      quantity,
      unit_price: unitPrice,
      line_total: round2(unitPrice * quantity),
    });
  }

  return { ok: true, value: priced };
}

/* Busca el cupón y aplica las mismas reglas que valida el carrito (activo, vencimiento, usos, mínimo) */
export async function resolveCoupon(
  supabase: SupabaseClient,
  couponId: number | null | undefined,
  subtotal: number
): Promise<Result<{ coupon: Coupon | null; discount: number }>> {
  if (!couponId) return { ok: true, value: { coupon: null, discount: 0 } };

  const { data: c } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", couponId)
    .eq("active", true)
    .single();

  if (!c) return { ok: false, error: "El cupón ya no es válido" };
  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    return { ok: false, error: "Este cupón ya venció" };
  }
  if (c.max_uses && (c.uses_count ?? 0) >= c.max_uses) {
    return { ok: false, error: "Este cupón ya alcanzó su límite de usos" };
  }
  if (c.min_order_amount && subtotal < c.min_order_amount) {
    return { ok: false, error: `Compra mínima de $${c.min_order_amount} requerida para el cupón` };
  }

  const discount =
    c.discount_type === "percentage"
      ? (subtotal * c.discount_value) / 100
      : Math.min(c.discount_value, subtotal);

  return { ok: true, value: { coupon: c, discount: round2(discount) } };
}

/*
 * Ítem único para la preferencia de MP con el total exacto del pedido.
 * Mandar los ítems sueltos cobraba subtotal + envío sin descontar el cupón,
 * y MP no acepta cantidades fraccionarias (1.5 kg).
 */
export function mpOrderItem(orderId: number, total: number) {
  return [
    {
      id: String(orderId),
      title: `Pedido #${orderId} - La Vaca Roja`,
      quantity: 1,
      unit_price: round2(total),
      currency_id: "ARS",
    },
  ];
}

export { round2 };
