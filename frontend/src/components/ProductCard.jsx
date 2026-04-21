import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "../context/CartContext";

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(p);

const badgeMap = {
  premium: { label: "Premium", cls: "badge-premium" },
  promo: { label: "Oferta", cls: "badge-promo" },
  new: { label: "Nuevo", cls: "badge-new" },
};

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(
    product.has_variants ? product.variants[1] ?? product.variants[0] : null
  );

  const displayPrice =
    product.price + (selectedVariant?.price_modifier ?? 0);

  const handleAdd = () => {
    addItem(product, selectedVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="product-card" id={`product-card-${product.id}`}>
      <div className="product-card-img-wrap">
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.badge && badgeMap[product.badge] && (
          <span className={`product-card-badge ${badgeMap[product.badge].cls}`}>
            {badgeMap[product.badge].label}
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

        <div className="product-card-footer">
          <div>
            <div className="product-card-price">{formatPrice(displayPrice)}</div>
            <span className="product-card-price-unit">por {product.unit}</span>
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
