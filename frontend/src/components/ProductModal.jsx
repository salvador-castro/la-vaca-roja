import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ShoppingCart, Check, Minus, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(p);

const isKg = (unit) => unit === "kg";

export default function ProductModal({ product, open, onClose }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(
    product.has_variants ? (product.variants[0] ?? null) : null
  );

  const byKg = isKg(product.unit);
  const step = byKg ? 0.5 : 1;
  const [qty, setQty] = useState(step);

  useEffect(() => {
    if (open) {
      setSelectedVariant(product.has_variants ? (product.variants[0] ?? null) : null);
      setQty(step);
      setAdded(false);
    }
  }, [open, product, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const decrease = () =>
    setQty((q) => parseFloat(Math.max(step, q - step).toFixed(1)));
  const increase = () => setQty((q) => parseFloat((q + step).toFixed(1)));

  const now = new Date();
  const promoActive =
    product.sale_price != null &&
    (!product.promo_starts_at || new Date(product.promo_starts_at) <= now) &&
    (!product.promo_ends_at || new Date(product.promo_ends_at) >= now);
  const displayPrice = promoActive ? product.sale_price : product.price;

  const handleAdd = () => {
    addItem(product, selectedVariant, qty, { openDrawer: false });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 700);
  };

  return createPortal(
    <>
      <div
        className="drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        id={`product-modal-${product.id}`}
      >
        <button
          className="drawer-close product-modal-close"
          onClick={onClose}
          aria-label="Cerrar"
          type="button"
        >
          <X size={18} />
        </button>

        <div className="product-modal-grid">
          <div className="product-modal-img-wrap">
            <img src={product.image} alt={product.name} />
            {product.badge && (
              <span className="product-card-badge badge-custom">
                {product.badge}
              </span>
            )}
          </div>

          <div className="product-modal-body">
            <span className="product-card-cat">{product.category}</span>
            <h2 className="product-modal-name">{product.name}</h2>
            <p className="product-modal-desc">{product.desc}</p>

            {product.has_variants && (
              <div
                className="variant-selector"
                role="group"
                aria-label="Seleccionar corte"
                style={{ marginTop: 12 }}
              >
                {product.variants.map((v) => (
                  <button
                    key={v.name}
                    className={`variant-btn ${selectedVariant?.name === v.name ? "active" : ""}`}
                    onClick={() => setSelectedVariant(v)}
                    aria-pressed={selectedVariant?.name === v.name}
                    type="button"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}

            <div className="qty-selector" style={{ marginTop: 16 }}>
              <button
                className="qty-btn"
                onClick={decrease}
                aria-label="Menos"
                type="button"
              >
                <Minus size={14} />
              </button>
              <span className="qty-value">
                {byKg ? `${qty} kg` : qty}
              </span>
              <button
                className="qty-btn"
                onClick={increase}
                aria-label="Más"
                type="button"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="product-modal-footer">
              <div>
                {promoActive && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                      textDecoration: "line-through",
                    }}
                  >
                    {formatPrice(product.price * qty)}
                  </div>
                )}
                <div
                  className="product-card-price"
                  style={{
                    fontSize: "1.8rem",
                    ...(promoActive ? { color: "var(--red)" } : {}),
                  }}
                >
                  {formatPrice(displayPrice * qty)}
                </div>
                <span className="product-card-price-unit">
                  {byKg
                    ? `${qty} kg · ${formatPrice(displayPrice)}/kg${promoActive ? ` (antes ${formatPrice(product.price)})` : ""}`
                    : `por ${product.unit}`}
                </span>
              </div>

              <button
                className={`btn btn-primary product-modal-add ${added ? "added" : ""}`}
                onClick={handleAdd}
                type="button"
                aria-label={`Agregar ${product.name} al carrito`}
              >
                {added ? (
                  <>
                    <Check size={16} strokeWidth={2.5} /> Agregado
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} strokeWidth={2.5} /> Agregar al carrito
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
