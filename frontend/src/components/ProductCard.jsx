import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "../context/CartContext";

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(p);

const isKg = (unit) => unit === "kg";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(
    product.has_variants ? (product.variants[0] ?? null) : null
  );

  const byKg = isKg(product.unit);
  const step = byKg ? 0.5 : 1;
  const [qty, setQty] = useState(step);

  const decrease = () => setQty((q) => parseFloat(Math.max(step, q - step).toFixed(1)));
  const increase = () => setQty((q) => parseFloat((q + step).toFixed(1)));

  const now = new Date();
  const promoActive =
    product.sale_price != null &&
    (!product.promo_starts_at || new Date(product.promo_starts_at) <= now) &&
    (!product.promo_ends_at || new Date(product.promo_ends_at) >= now);
  const displayPrice = promoActive ? product.sale_price : product.price;

  const handleAdd = () => {
    addItem(product, selectedVariant, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="product-card" id={`product-card-${product.id}`}>
      <div className="product-card-img-wrap">
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.badge && (
          <span className="product-card-badge badge-custom">
            {product.badge}
          </span>
        )}
      </div>

      <div className="product-card-body">
        <span className="product-card-cat">{product.category}</span>
        <h3 className="product-card-name">{product.name}</h3>
        <p className="product-card-desc">{product.desc}</p>

        {product.has_variants && (
          <div className="variant-selector" role="group" aria-label="Seleccionar corte">
            {product.variants.map((v) => (
              <button
                key={v.name}
                className={`variant-btn ${selectedVariant?.name === v.name ? "active" : ""}`}
                onClick={() => setSelectedVariant(v)}
                aria-pressed={selectedVariant?.name === v.name}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}

        <div className="qty-selector">
          <button className="qty-btn" onClick={decrease} aria-label="Menos" type="button">−</button>
          <span className="qty-value">
            {byKg ? `${qty} kg` : qty}
          </span>
          <button className="qty-btn" onClick={increase} aria-label="Más" type="button">+</button>
        </div>

        <div className="product-card-footer">
          <div>
            {promoActive && (
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", textDecoration: "line-through" }}>
                {formatPrice(product.price * qty)}
              </div>
            )}
            <div className="product-card-price" style={promoActive ? { color: "var(--red)" } : undefined}>
              {formatPrice(displayPrice * qty)}
            </div>
            <span className="product-card-price-unit">
              {byKg
                ? `${qty} kg · ${formatPrice(displayPrice)}/kg${promoActive ? ` (antes ${formatPrice(product.price)})` : ""}`
                : `por ${product.unit}`}
            </span>
          </div>
          <button
            className={`add-to-cart-btn ${added ? "added" : ""}`}
            onClick={handleAdd}
            id={`add-btn-${product.id}`}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            {added ? (
              <Check size={16} strokeWidth={2.5} />
            ) : (
              <ShoppingCart size={16} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
