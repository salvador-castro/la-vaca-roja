import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { useProducts } from "../hooks/useProducts";
import ProductCard from "../components/ProductCard";

export default function Shop() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialCat = params.get("cat") || "Todos";

  const [activeCategory, setActiveCategory] = useState(initialCat);
  const [search, setSearch] = useState("");
  const { products, categories, loading, error } = useProducts();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const filtered = products.filter((p) => {
    const matchCat =
      activeCategory === "Todos" || p.category === activeCategory;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <main id="shop-page">
      {/* Header */}
      <section className="shop-hero" aria-label="Tienda header">
        <div className="container">
          <span className="section-eyebrow">Tienda Online</span>
          <h1
            className="section-title"
            style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}
          >
            Nuestros <span>Productos</span>
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.95rem",
              marginTop: 10,
              fontStyle: "italic",
            }}
          >
            {loading
              ? "Cargando productos..."
              : `${products.length} productos disponibles · Envío a todo Buenos Aires · Frescos todos los días`}
          </p>

          <div className="shop-search-wrap">
            <Search size={16} />
            <input
              id="shop-search"
              type="search"
              className="shop-search-input"
              placeholder="Buscar cortes, embutidos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar productos"
            />
          </div>

          <div
            className="filter-bar"
            role="group"
            aria-label="Filtrar por categoría"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-pill ${activeCategory === cat ? "active" : ""}`}
                id={`filter-${cat.toLowerCase()}`}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <div className="container" style={{ paddingTop: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 0",
            borderBottom: "1px solid var(--border)",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: "0.85rem",
              color: "var(--muted)",
              fontStyle: "italic",
            }}
          >
            <SlidersHorizontal
              size={14}
              style={{ display: "inline", marginRight: 6 }}
            />
            {filtered.length}{" "}
            {filtered.length === 1 ? "resultado" : "resultados"}
            {activeCategory !== "Todos" && ` en "${activeCategory}"`}
            {search && ` para "${search}"`}
          </span>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "var(--muted)",
              fontStyle: "italic",
            }}
          >
            Cargando productos...
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "var(--muted)",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
            <p style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
              No se cargaron productos para vender.
            </p>
          </div>
        ) : filtered.length > 0 ? (
          <div
            className="product-grid"
            id="product-grid"
            style={{ paddingBottom: 80 }}
          >
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "var(--muted)",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔍</div>
            <h2
              style={{
                fontFamily: "var(--font-head)",
                color: "var(--text)",
                fontSize: "1.6rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              No encontramos productos
            </h2>
            <p style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
              Probá con otra categoría o término de búsqueda
            </p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 20 }}
              onClick={() => {
                setActiveCategory("Todos");
                setSearch("");
              }}
            >
              Ver todos
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
