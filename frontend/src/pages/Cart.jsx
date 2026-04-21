import { Link } from "react-router-dom";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { items, removeItem, updateQty, total, clearCart } = useCart();

  const formatPrice = (p) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(p);

  const shipping = total > 15000 ? 0 : 1500;
  const finalTotal = total + shipping;

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
                  key={item.id}
                  className="cart-item"
                  id={`cart-item-${item.id}`}
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
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        aria-label="Restar cantidad"
                        id={`qty-minus-${item.id}`}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="qty-value">{item.qty}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        aria-label="Sumar cantidad"
                        id={`qty-plus-${item.id}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Eliminar ${item.name}`}
                      id={`remove-btn-${item.id}`}
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

            <div className="summary-row">
              <span>
                Subtotal ({items.reduce((s, i) => s + i.qty, 0)} ítems)
              </span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="summary-row">
              <span>Envío</span>
              <span
                style={{ color: shipping === 0 ? "#22c55e" : "var(--text)" }}
              >
                {shipping === 0 ? "🎉 Gratis" : formatPrice(shipping)}
              </span>
            </div>

            {shipping > 0 && (
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
                🚀 Sumá {formatPrice(15000 - total)} más para envío gratis
              </div>
            )}

            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(finalTotal)}</span>
            </div>

            <button className="checkout-btn" id="checkout-btn">
              Finalizar Compra →
            </button>

            {/* Trust badges */}
            <div
              style={{
                marginTop: 20,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
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
