import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Loader,
  MapPin, Store, AlertTriangle,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function Cart() {
  const { items, removeItem, updateQty, total, clearCart, coupon } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [notes, setNotes] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("delivery");
  const [freeShippingMin, setFreeShippingMin] = useState(15000);

  const formatPrice = (p) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(p);

  // Cargar mínimo para envío gratis desde el backend
  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.free_shipping_min) {
          setFreeShippingMin(Number(data.free_shipping_min));
        }
      })
      .catch(() => {});
  }, []);

  const isPickup = deliveryMethod === "pickup";
  const hasAddress = Boolean(profile?.address?.trim());

  const shipping = isPickup ? 0 : (total >= freeShippingMin ? 0 : 1500);
  const finalTotal = total + shipping;

  const canCheckout = isPickup || hasAddress;

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const payload = {
        items: items.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          variant_name: item.variant?.name ?? null,
          quantity: item.qty,
          unit_price: item.price,
          line_total: parseFloat((item.price * item.qty).toFixed(2)),
        })),
        coupon_id: coupon?.id ?? null,
        notes: notes.trim() || null,
        shipping,
        delivery_method: deliveryMethod,
      };

      const res = await fetch(`${API_URL}/api/payment/create-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al iniciar el pago");

      const useSandbox = import.meta.env.DEV || import.meta.env.VITE_MP_SANDBOX === "true";
      const checkoutUrl = useSandbox ? data.sandbox_init_point : data.init_point;

      window.location.href = checkoutUrl;
    } catch (err) {
      setCheckoutError(err.message);
      setCheckoutLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="cart-page" id="cart-page">
        <div className="container">
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h1>Tu carrito está vacío</h1>
            <p style={{ fontSize: "0.95rem", marginTop: 8 }}>
              Todavía no agregaste ningún producto a tu carrito
            </p>
            <Link
              to="/shop"
              className="btn btn-primary"
              style={{ marginTop: 28, display: "inline-flex" }}
            >
              <ShoppingBag size={16} /> Ir a la Tienda
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page" id="cart-page">
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 48,
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/shop"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.85rem",
              color: "var(--muted)",
              transition: "color 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
            id="cart-back-link"
          >
            <ArrowLeft size={16} /> Seguir comprando
          </Link>
          <h1 className="cart-title" style={{ margin: 0 }}>
            Tu <span style={{ color: "var(--red)" }}>Carrito</span>
          </h1>
        </div>

        <div className="cart-layout">
          {/* Items */}
          <div>
            <div className="cart-items" id="cart-items-list">
              {items.map((item) => (
                <article
                  key={item.cartKey}
                  className="cart-item"
                  id={`cart-item-${item.cartKey}`}
                >
                  <img
                    className="cart-item-img"
                    src={item.image}
                    alt={item.name}
                  />
                  <div className="cart-item-info">
                    <div className="cart-item-cat">{item.category}</div>
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">
                      {formatPrice(item.price * item.qty)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                        marginTop: 2,
                      }}
                    >
                      {formatPrice(item.price)} × {item.qty}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 12,
                    }}
                  >
                    <div className="qty-controls">
                      {(() => {
                        const step = item.unit === "kg" ? 0.5 : 1;
                        const newQtyDown = parseFloat((item.qty - step).toFixed(1));
                        const newQtyUp = parseFloat((item.qty + step).toFixed(1));
                        return (
                          <>
                            <button
                              className="qty-btn"
                              onClick={() => updateQty(item.cartKey, newQtyDown)}
                              aria-label="Restar cantidad"
                              id={`qty-minus-${item.cartKey}`}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="qty-value">
                              {item.unit === "kg" ? `${item.qty} kg` : item.qty}
                            </span>
                            <button
                              className="qty-btn"
                              onClick={() => updateQty(item.cartKey, newQtyUp)}
                              aria-label="Sumar cantidad"
                              id={`qty-plus-${item.cartKey}`}
                            >
                              <Plus size={14} />
                            </button>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => removeItem(item.cartKey)}
                      aria-label={`Eliminar ${item.name}`}
                      id={`remove-btn-${item.cartKey}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Clear cart */}
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                onClick={clearCart}
                style={{
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--red)";
                  e.currentTarget.style.borderColor = "rgba(200,16,46,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--muted)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
                id="clear-cart-btn"
              >
                Vaciar carrito
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="cart-summary" id="cart-summary">
            <div className="cart-summary-title">Resumen del pedido</div>

            {/* Método de entrega */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 8 }}>
                Método de entrega
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setDeliveryMethod("delivery")}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "12px 8px",
                    borderRadius: "var(--radius)",
                    border: `2px solid ${deliveryMethod === "delivery" ? "var(--red)" : "var(--border)"}`,
                    background: deliveryMethod === "delivery" ? "rgba(200,16,46,0.06)" : "var(--surface)",
                    color: deliveryMethod === "delivery" ? "var(--red)" : "var(--muted)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: deliveryMethod === "delivery" ? 600 : 400,
                    transition: "all 0.2s",
                  }}
                >
                  <MapPin size={18} />
                  Envío a domicilio
                </button>
                <button
                  onClick={() => setDeliveryMethod("pickup")}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "12px 8px",
                    borderRadius: "var(--radius)",
                    border: `2px solid ${deliveryMethod === "pickup" ? "var(--red)" : "var(--border)"}`,
                    background: deliveryMethod === "pickup" ? "rgba(200,16,46,0.06)" : "var(--surface)",
                    color: deliveryMethod === "pickup" ? "var(--red)" : "var(--muted)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: deliveryMethod === "pickup" ? 600 : 400,
                    transition: "all 0.2s",
                  }}
                >
                  <Store size={18} />
                  Retiro en local
                </button>
              </div>

              {/* Alerta: falta dirección para envío a domicilio */}
              {deliveryMethod === "delivery" && user && !hasAddress && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    background: "rgba(200,16,46,0.07)",
                    border: "1px solid rgba(200,16,46,0.25)",
                    borderRadius: "var(--radius)",
                    fontSize: "0.78rem",
                    color: "var(--red)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    No tenés dirección guardada.{" "}
                    <Link
                      to="/dashboard"
                      style={{ color: "var(--red)", fontWeight: 600, textDecoration: "underline" }}
                    >
                      Configurala en tu perfil
                    </Link>{" "}
                    para poder recibir el pedido.
                  </span>
                </div>
              )}

              {deliveryMethod === "delivery" && user && hasAddress && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "rgba(34,197,94,0.07)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: "var(--radius)",
                    fontSize: "0.78rem",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <MapPin size={13} />
                  {profile.address}
                </div>
              )}

              {deliveryMethod === "pickup" && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "rgba(212,163,15,0.07)",
                    border: "1px solid rgba(212,163,15,0.2)",
                    borderRadius: "var(--radius)",
                    fontSize: "0.78rem",
                    color: "var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Store size={13} />
                  Retirás en nuestro local — sin costo de envío
                </div>
              )}
            </div>

            <div className="summary-row">
              <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} ítems)</span>
              <span>{formatPrice(total)}</span>
            </div>

            <div className="summary-row">
              <span>Envío</span>
              <span style={{ color: shipping === 0 ? "#22c55e" : "var(--text)" }}>
                {isPickup
                  ? "🏪 Sin costo (retiro)"
                  : shipping === 0
                  ? "🎉 Gratis"
                  : formatPrice(shipping)}
              </span>
            </div>

            {!isPickup && shipping > 0 && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  background: "rgba(212,163,15,0.08)",
                  border: "1px solid rgba(212,163,15,0.15)",
                  borderRadius: "var(--radius)",
                  fontSize: "0.78rem",
                  color: "var(--gold)",
                  lineHeight: 1.5,
                }}
              >
                🚀 Sumá {formatPrice(freeShippingMin - total)} más para envío gratis
              </div>
            )}

            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(finalTotal)}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="order-notes"
                style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)", marginBottom: 6 }}
              >
                Comentarios del pedido <span style={{ fontStyle: "italic" }}>(opcional)</span>
              </label>
              <textarea
                id="order-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: sin sal, entregar por la tarde, apto celíaco..."
                rows={3}
                style={{
                  width: "100%",
                  resize: "vertical",
                  padding: "10px 12px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {checkoutError && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  background: "rgba(200,16,46,0.08)",
                  border: "1px solid rgba(200,16,46,0.2)",
                  borderRadius: "var(--radius)",
                  fontSize: "0.82rem",
                  color: "var(--red)",
                }}
              >
                {checkoutError}
              </div>
            )}

            <button
              className="checkout-btn"
              id="checkout-btn"
              onClick={handleCheckout}
              disabled={checkoutLoading || !canCheckout}
              style={{ opacity: (checkoutLoading || !canCheckout) ? 0.55 : 1 }}
              title={!canCheckout ? "Configurá tu dirección para envío a domicilio" : undefined}
            >
              {checkoutLoading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Procesando...
                </span>
              ) : (
                "Finalizar Compra →"
              )}
            </button>

            {/* Trust badges */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: "🔒", text: "Pago 100% seguro" },
                { icon: "↩️", text: "Devolución garantizada" },
                { icon: "🌡️", text: "Cadena de frío garantida" },
              ].map((b) => (
                <div
                  key={b.text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                  }}
                >
                  <span>{b.icon}</span>
                  {b.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
