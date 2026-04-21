import { createContext, useContext, useState, useCallback } from "react";

const CartContext = createContext(null);

/* cartKey permite tener el mismo producto en distintas variantes */
const makeKey = (productId, variantName) =>
  variantName ? `${productId}-${variantName}` : String(productId);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [coupon, setCoupon] = useState(null);

  const addItem = useCallback((product, variant = null) => {
    const cartKey = makeKey(product.id, variant?.name);
    const price = product.price + (variant?.price_modifier ?? 0);

    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          ...product,
          cartKey,
          variant,
          price,
          qty: 1,
        },
      ];
    });
    setDrawerOpen(true);
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
