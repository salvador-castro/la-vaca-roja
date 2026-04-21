import { X, ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";

export default function CartDrawer() {
  const {
    items,
    removeItem,
    updateQty,
    total,
    count,
    drawerOpen,
    setDrawerOpen,
  } = useCart();

  if (!drawerOpen) return null;

  const formatPrice = (p) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(p);

  return (
    <>
      <div
        className="drawer-overlay"
        onClick={() => setDrawerOpen(false)}
        id="cart-drawer-overlay"
        aria-hidden="true"
      />
      <aside
        className="drawer"
        id="cart-drawer"
        role="dialog"
        aria-label="Carrito de compras"
      >
        <div className="drawer-header">
          <h3>
            <ShoppingBag
              size={18}
              style={{ display: "inline", marginRight: 8, color: "var(--red)" }}
            />
            Tu Carrito ({count} {count === 1 ? "ítem" : "ítems"})
          </h3>
          <button
            className="drawer-close"
            onClick={() => setDrawerOpen(false)}
            id="cart-drawer-close"
            aria-label="Cerrar carrito"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--muted)",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>🛒</div>
              <p
                style={{
                  fontFamily: "var(--font-head)",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "var(--text)",
                  marginBottom: 8,
                }}
              >
                Tu carrito está vacío
              </p>
              <p style={{ fontSize: "0.85rem" }}>
                Agregá cortes premium desde nuestra tienda
              </p>
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
              <div
                key={item.id}
                className="cart-item"
                id={`drawer-item-${item.id}`}
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
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div className="qty-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      aria-label="Restar"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="qty-value">{item.qty}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      aria-label="Sumar"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Eliminar ${item.name}`}
                    style={{ width: 28, height: 28 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-footer">
            <div className="drawer-total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Link
              to="/cart"
              className="checkout-btn"
              onClick={() => setDrawerOpen(false)}
              id="drawer-checkout-btn"
            >
              Finalizar Compra →
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "10px",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                fontSize: "0.85rem",
                transition: "all var(--transition)",
              }}
            >
              Seguir comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
