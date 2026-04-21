import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Flame,
  Star,
  Truck,
  ShieldCheck,
  Award,
} from "lucide-react";
import { products } from "../data/products";
import ProductCard from "../components/ProductCard";

/* ---------- Particles ---------- */
function Particles() {
  const sizes = [4, 6, 5, 3, 7, 4, 5, 3, 6, 4];
  const colors = [
    "rgba(200,16,46,0.7)",
    "rgba(200,16,46,0.5)",
    "rgba(212,163,15,0.4)",
    "rgba(200,16,46,0.6)",
  ];
  return (
    <div className="hero-particles" aria-hidden="true">
      {sizes.map((s, i) => (
        <div
          key={i}
          className="particle"
          style={{
            width: s,
            height: s,
            background: colors[i % colors.length],
            left: `${10 + i * 8}%`,
            bottom: `${15 + (i % 3) * 12}%`,
            "--drift": `${(i % 2 === 0 ? 1 : -1) * (10 + i * 5)}px`,
            animationDuration: `${4 + i * 0.7}s`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ---------- Bank Promos ---------- */
const banks = [
  {
    name: "Banco Galicia",
    abbr: "GAL",
    color: "#c8102e",
    bg: "#1a0808",
    discount: "40%",
    deal: "Todos los martes — Visa y Mastercard",
    days: "Martes",
  },
  {
    name: "BBVA",
    abbr: "BBVA",
    color: "#004a9f",
    bg: "#080f1a",
    discount: "25%",
    deal: "Los miércoles con tarjeta BBVA",
    days: "Miércoles",
  },
  {
    name: "Santander",
    abbr: "SAN",
    color: "#ec0000",
    bg: "#1a0808",
    discount: "30%",
    deal: "Viernes con Select — Visa y Debit",
    days: "Viernes",
  },
  {
    name: "Macro",
    abbr: "MCR",
    color: "#f5a623",
    bg: "#1a1208",
    discount: "20%",
    deal: "Jueves con Macro — todas las tarjetas",
    days: "Jueves",
  },
  {
    name: "Naranja X",
    abbr: "NRJ",
    color: "#ff6600",
    bg: "#1a1008",
    discount: "35%",
    deal: "Sábados con Naranja Visa",
    days: "Sábados",
  },
  {
    name: "Banco Nación",
    abbr: "BNA",
    color: "#1e5fa8",
    bg: "#080f1a",
    discount: "15%",
    deal: "Lunes y miércoles — débito BNA",
    days: "Lun y Mié",
  },
];

/* ---------- Featured promos ---------- */
const promos = [
  {
    id: 1,
    tag: "🔥 Top ventas",
    title: "Pack Asado Completo",
    sub: "Tira, vacío, chorizo y morcilla para 4 personas",
    img: "/images/ribs.png",
    discount: "20%",
  },
  {
    id: 2,
    tag: "⚡ Oferta flash",
    title: "Hamburguesas Artesanales",
    sub: "Pack x8 medallones premium de 180g c/u",
    img: "/images/burger.png",
    discount: "30%",
  },
  {
    id: 3,
    tag: "👑 Premium",
    title: "Ojo de Bife Black Angus",
    sub: "Corte de autor con marmoleado excepcional",
    img: "/images/ribeye.png",
    discount: "15%",
  },
];

/* ---------- Scroll reveal hook ---------- */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        }),
      { threshold: 0.12 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

export default function Home() {
  useReveal();
  const featuredProducts = products.slice(0, 4);

  return (
    <main id="home-page">
      {/* ====== HERO ====== */}
      <section className="hero noise" id="hero" aria-label="Hero">
        <div className="hero-bg">
          <div className="hero-bg-img" />
          <div className="hero-gradient" />
          <div className="hero-orb hero-orb-1" aria-hidden="true" />
          <div className="hero-orb hero-orb-2" aria-hidden="true" />
          <div className="hero-orb hero-orb-3" aria-hidden="true" />
          <Particles />
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Buenos Aires · Argentina · Desde 2004
          </div>

          <h1 className="hero-title">
            <span className="hero-title-line">La Mejor</span>
            <span className="hero-title-line">
              <span className="accent">Carne</span>
            </span>
            <span className="hero-title-line">de Argentina</span>
          </h1>

          <p className="hero-subtitle">
            Cortes premium seleccionados a mano, con más de 20 años de
            tradición. Delivery a todo Buenos Aires. Calidad garantizada o te
            devolvemos el dinero.
          </p>

          <div className="hero-actions">
            <Link
              to="/shop"
              className="btn btn-primary btn-lg"
              id="hero-shop-btn"
            >
              Ver Tienda <ArrowRight size={18} />
            </Link>
            <a
              href="#promos"
              className="btn btn-ghost btn-lg"
              id="hero-promos-btn"
            >
              🔥 Ver Promociones
            </a>
          </div>

          <div className="hero-stats">
            <div>
              <div className="hero-stat-value">
                20<span>+</span>
              </div>
              <div className="hero-stat-label">Años de trayectoria</div>
            </div>
            <div>
              <div className="hero-stat-value">
                15<span>k</span>
              </div>
              <div className="hero-stat-label">Clientes satisfechos</div>
            </div>
            <div>
              <div className="hero-stat-value">
                60<span>+</span>
              </div>
              <div className="hero-stat-label">Cortes disponibles</div>
            </div>
            <div>
              <div className="hero-stat-value">
                4.9<span>★</span>
              </div>
              <div className="hero-stat-label">Calificación promedio</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FEATURED PROMOS ====== */}
      <section
        className="section"
        id="promos"
        aria-label="Promociones destacadas"
      >
        <div className="container">
          <div className="reveal">
            <div className="section-label">
              <Flame size={14} /> Promociones Destacadas
            </div>
            <h2 className="section-title">
              Ofertas que no <span>podés perder</span>
            </h2>
            <p className="section-sub">
              Promos actualizadas cada semana. Aprovechá los mejores descuentos
              en cortes seleccionados.
            </p>
          </div>

          <div className="promos-grid reveal" style={{ marginTop: 48 }}>
            {promos.map((p, i) => (
              <article
                key={p.id}
                className={`promo-card reveal reveal-delay-${i + 1}`}
                id={`promo-card-${p.id}`}
              >
                <img
                  className="promo-card-img"
                  src={p.img}
                  alt={p.title}
                  loading="lazy"
                />
                <div className="promo-card-overlay">
                  <span className="promo-card-tag">{p.tag}</span>
                  <h3 className="promo-card-title">{p.title}</h3>
                  <p className="promo-card-sub">{p.sub}</p>
                </div>
                <div
                  className="promo-discount"
                  aria-label={`${p.discount} de descuento`}
                >
                  <span className="promo-discount-pct">{p.discount}</span>
                  <span className="promo-discount-off">OFF</span>
                </div>
              </article>
            ))}
          </div>

          <div
            className="reveal"
            style={{ marginTop: 40, textAlign: "center" }}
          >
            <Link to="/shop" className="btn btn-ghost">
              Ver todas las ofertas <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ====== BANK PROMOS ====== */}
      <section
        className="section bank-section"
        id="bank-promos"
        aria-label="Promociones con bancos"
      >
        <div className="container">
          <div className="reveal">
            <div className="section-label">
              <Star size={14} /> Beneficios Bancarios
            </div>
            <h2 className="section-title">
              Promociones con <span>tu banco</span>
            </h2>
            <p className="section-sub">
              Descuentos exclusivos para clientes de los principales bancos del
              país. Combiná tu tarjeta y ahorrá en cada compra.
            </p>
          </div>

          <div className="banks-grid">
            {banks.map((b, i) => (
              <div
                key={b.name}
                className={`bank-card reveal reveal-delay-${(i % 3) + 1}`}
                id={`bank-card-${i}`}
              >
                <div
                  className="bank-logo"
                  style={{
                    background: b.bg,
                    color: b.color,
                    border: `1px solid ${b.color}33`,
                  }}
                >
                  {b.abbr}
                </div>
                <div className="bank-info">
                  <div className="bank-name">{b.name}</div>
                  <div className="bank-deal">{b.deal}</div>
                </div>
                <div className="bank-discount">{b.discount}</div>
              </div>
            ))}
          </div>

          <div
            className="reveal"
            style={{
              marginTop: 32,
              padding: "20px 24px",
              background: "rgba(212,163,15,0.06)",
              border: "1px solid rgba(212,163,15,0.18)",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>💳</span>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: "var(--text)" }}>
                ¿Cómo aplicar el descuento?
              </strong>{" "}
              Ingresá con tu cuenta, hacé tu pedido y seleccioná tu banco al
              finalizar la compra. El descuento se aplica automáticamente.
              Válido para compras online y en local. Máximo 2 usos por tarjeta
              por mes.
            </p>
          </div>
        </div>
      </section>

      {/* ====== FEATURED PRODUCTS ====== */}
      <section
        className="section"
        id="featured-products"
        aria-label="Productos destacados"
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 40,
            }}
          >
            <div className="reveal">
              <div className="section-label">🥩 Lo más vendido</div>
              <h2 className="section-title">
                Cortes <span>Estrella</span>
              </h2>
            </div>
            <Link to="/shop" className="btn btn-ghost btn-sm reveal">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>

          <div className="product-grid">
            {featuredProducts.map((p, i) => (
              <div key={p.id} className={`reveal reveal-delay-${i + 1}`}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FEATURES / WHY US ====== */}
      <section
        className="section"
        id="nosotros"
        style={{ paddingBottom: 120 }}
        aria-label="Por qué elegirnos"
      >
        <div className="container">
          <div
            className="reveal"
            style={{ textAlign: "center", marginBottom: 0 }}
          >
            <div className="section-label" style={{ justifyContent: "center" }}>
              <Award size={14} /> ¿Por qué elegirnos?
            </div>
            <h2 className="section-title" style={{ textAlign: "center" }}>
              Calidad que se <span>siente</span>
            </h2>
          </div>

          <div className="features-grid">
            {[
              {
                icon: "🥩",
                title: "Cortes de Primera",
                desc: "Seleccionamos cada pieza a mano. Solo trabajamos con los mejores frigoríficos del país.",
              },
              {
                icon: "🚚",
                title: "Delivery Express",
                desc: "Entregas en el mismo día dentro de CABA. Llegamos fresh a tu puerta.",
              },
              {
                icon: "🏆",
                title: "20 Años de Experiencia",
                desc: "Dos décadas atendiendo a las familias porteñas con dedicación y pasión.",
              },
              {
                icon: "💳",
                title: "Múltiples Medios de Pago",
                desc: "Efectivo, tarjetas, transferencia. Con descuentos exclusivos según tu banco.",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`feature-card reveal reveal-delay-${i + 1}`}
                id={`feature-${i}`}
              >
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
