import { useState } from "react";
import { ShoppingCart, Plus, Check } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const formatPrice = (p) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(p);

  const badgeMap = {
    premium: { label: "Premium", cls: "badge-new" },
    promo: { label: "Oferta", cls: "badge-promo" },
    new: { label: "Nuevo", cls: "badge-new" },
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

        <div className="product-card-footer">
          <div>
            <div className="product-card-price">
              {formatPrice(product.price)}
            </div>
            <span className="product-card-price-unit">por {product.unit}</span>
          </div>
          <button
            className={`add-to-cart-btn ${added ? "added" : ""}`}
            onClick={handleAdd}
            id={`add-btn-${product.id}`}
            aria-label={`Agregar ${product.name} al carrito`}
            title="Agregar al carrito"
          >
            {added ? (
              <Check size={18} strokeWidth={2.5} />
            ) : (
              <Plus size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
