import { useState } from "react";
import { X, ShoppingBag, Minus, Plus, Trash2, Tag, Check, AlertCircle } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(p);

export default function CartDrawer() {
  const {
    items, removeItem, updateQty,
    subtotal, couponDiscount, total, count,
    drawerOpen, setDrawerOpen,
    coupon, setCoupon,
  } = useCart();

  const { user } = useAuth();
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  if (!drawerOpen) return null;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError("");

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponInput.trim().toUpperCase())
      .eq("active", true)
      .single();

    setCouponLoading(false);

    if (error || !data) {
      setCouponError("Cupón inválido o inactivo.");
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponError("Este cupón ya venció.");
      return;
    }
    if (data.max_uses && data.uses_count >= data.max_uses) {
      setCouponError("Este cupón ya alcanzó su límite de usos.");
      return;
    }
    if (data.min_order_amount && subtotal < data.min_order_amount) {
      setCouponError(`Compra mínima de ${formatPrice(data.min_order_amount)} requerida.`);
      return;
    }

    setCoupon(data);
    setCouponInput("");
  };

  return (
    <>
      <div
        className="drawer-overlay"
        onClick={() => setDrawerOpen(false)}
        id="cart-drawer-overlay"
        aria-hidden="true"
      />
      <aside className="drawer" id="cart-drawer" role="dialog" aria-label="Carrito de compras">
        <div className="drawer-header">
          <h3>
            <ShoppingBag size={18} style={{ display: "inline", marginRight: 8, color: "var(--red)" }} />
            Tu Carrito ({count} {count === 1 ? "ítem" : "ítems"})
          </h3>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Cerrar carrito">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>🛒</div>
              <p style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "1rem", color: "var(--text)", marginBottom: 8 }}>
                Tu carrito está vacío
              </p>
              <p style={{ fontSize: "0.85rem" }}>Agregá cortes premium desde nuestra tienda</p>
              <Link
                to="/shop"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 20, display: "inline-flex" }}
                onClick={() => setDrawerOpen(false)}
              >
                Ver Tienda
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.cartKey} className="cart-item" id={`drawer-item-${item.cartKey}`}>
                <img className="cart-item-img" src={item.image} alt={item.name} />
                <div className="cart-item-info">
                  <div className="cart-item-cat">{item.category}</div>
                  <div className="cart-item-name">
                    {item.name}
                    {item.variant && (
                      <span className="cart-item-variant"> · {item.variant.name}</span>
                    )}
                  </div>
                  <div className="cart-item-price">{formatPrice(item.price * item.qty)}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div className="qty-controls">
                    {(() => {
                      const step = item.unit === "kg" ? 0.5 : 1;
                      const newQtyDown = parseFloat((item.qty - step).toFixed(1));
                      const newQtyUp = parseFloat((item.qty + step).toFixed(1));
                      return (
                        <>
                          <button className="qty-btn" onClick={() => updateQty(item.cartKey, newQtyDown)} aria-label="Restar">
                            <Minus size={13} />
                          </button>
                          <span className="qty-value">{item.unit === "kg" ? `${item.qty} kg` : item.qty}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.cartKey, newQtyUp)} aria-label="Sumar">
                            <Plus size={13} />
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  <button className="remove-btn" onClick={() => removeItem(item.cartKey)} aria-label={`Eliminar ${item.name}`} style={{ width: 28, height: 28 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-footer">
            {/* Cupón */}
            {!coupon ? (
              <div className="coupon-row">
                <div className="coupon-input-wrap">
                  <Tag size={14} />
                  <input
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                    placeholder="Código de descuento"
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
                <button className="btn btn-ghost btn-sm coupon-apply-btn" onClick={applyCoupon} disabled={couponLoading}>
                  {couponLoading ? <span className="btn-spinner" /> : "Aplicar"}
                </button>
                {couponError && (
                  <div className="coupon-error">
                    <AlertCircle size={12} /> {couponError}
                  </div>
                )}
              </div>
            ) : (
              <div className="coupon-applied">
                <Check size={14} color="var(--red)" />
                <span>Cupón <strong>{coupon.code}</strong> aplicado</span>
                <button className="coupon-remove-btn" onClick={() => setCoupon(null)}>
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Totals */}
            {coupon && (
              <div className="drawer-subtotal">
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
            )}
            {coupon && couponDiscount > 0 && (
              <div className="drawer-discount">
                <span>Descuento</span><span>-{formatPrice(couponDiscount)}</span>
              </div>
            )}
            <div className="drawer-total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            {user ? (
              <Link
                to="/cart"
                className="checkout-btn"
                onClick={() => setDrawerOpen(false)}
                id="drawer-checkout-btn"
              >
                Finalizar Compra →
              </Link>
            ) : (
              <Link
                to="/login"
                className="checkout-btn"
                onClick={() => setDrawerOpen(false)}
              >
                Ingresá para comprar →
              </Link>
            )}
            <button
              onClick={() => setDrawerOpen(false)}
              className="btn btn-ghost"
              style={{ width: "100%", marginTop: 10 }}
            >
              Seguir comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
