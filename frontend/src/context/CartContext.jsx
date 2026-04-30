import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";

const CartContext = createContext(null);

const STORAGE_KEY = "lvr_cart";

/* cartKey permite tener el mismo producto en distintas variantes */
const makeKey = (productId, variantName) =>
  variantName ? `${productId}-${variantName}` : String(productId);

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], coupon: null };
    return JSON.parse(raw);
  } catch {
    return { items: [], coupon: null };
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadFromStorage().items);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [coupon, setCoupon] = useState(() => loadFromStorage().coupon);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, coupon }));
  }, [items, coupon]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setItems([]);
        setCoupon(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const addItem = useCallback((product, variant = null, qty = 1, { openDrawer = true } = {}) => {
    const cartKey = makeKey(product.id, variant?.name);
    const now = new Date();
    const promoActive =
      product.sale_price != null &&
      (!product.promo_starts_at || new Date(product.promo_starts_at) <= now) &&
      (!product.promo_ends_at || new Date(product.promo_ends_at) >= now);
    const price = promoActive ? product.sale_price : product.price;

    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey
            ? { ...i, qty: parseFloat((i.qty + qty).toFixed(3)) }
            : i
        );
      }
      return [...prev, { ...product, cartKey, variant, price, qty }];
    });
    if (openDrawer) setDrawerOpen(true);
  }, []);

  const removeItem = useCallback((cartKey) => {
    setItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
  }, []);

  const updateQty = useCallback((cartKey, qty) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.cartKey === cartKey ? { ...i, qty } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const couponDiscount = coupon
    ? coupon.discount_type === "percentage"
      ? subtotal * (coupon.discount_value / 100)
      : Math.min(coupon.discount_value, subtotal)
    : 0;
  const total = subtotal - couponDiscount;
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        subtotal,
        couponDiscount,
        total,
        count,
        drawerOpen,
        setDrawerOpen,
        coupon,
        setCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};
