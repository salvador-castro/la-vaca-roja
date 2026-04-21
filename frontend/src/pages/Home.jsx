import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame, Star, Truck, ShieldCheck, Award, Clock } from "lucide-react";
import { products } from "../data/products";
import ProductCard from "../components/ProductCard";

/* ---- Scroll reveal ---- */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ---- Static data ---- */
const banks = [
  { 
    name: "Cuenta DNI", 
    abbr: "DNI",
    color: "#007a5e", 
    discount: "20%", 
    deal: "Tope: $5000 / mes", 
    days: "Lun a Vie (Abril)",
    img: "https://gfjkhzudkctakwcyqmmj.supabase.co/storage/v1/object/public/logosBancos/logoCuentaDNI.png"
  },
  { 
    name: "BBVA", 
    abbr: "BBVA",
    color: "#004a9f", 
    discount: "30%", 
    deal: "Tope: $12000 / mes", 
    days: "Martes",
    img: "https://gfjkhzudkctakwcyqmmj.supabase.co/storage/v1/object/public/logosBancos/logoBBVA.png"
  },
  { 
    name: "Ualá", 
    abbr: "UAL",
    color: "#ff3b5c", 
    discount: "35%", 
    deal: "Tope: $20000 / mes", 
    days: "Todos los días",
    img: "https://gfjkhzudkctakwcyqmmj.supabase.co/storage/v1/object/public/logosBancos/logoUALA.png"
  },
];

const promos = [
  { id: 1, icon: "🥩", title: "Pack Asado Completo", desc: "Tira, vacío, chorizo y morcilla para 4 personas. El combo definitivo para el domingo." },
  { id: 2, icon: "🍔", title: "Hamburguesas Artesanales", desc: "Pack x8 medallones premium de 180g. Sin conservantes, sin aditivos." },
  { id: 3, icon: "🏆", title: "Ojo de Bife Black Angus", desc: "Corte de autor con marmoleado excepcional. El rey de la parrilla argentina." },
];

const features = [
  { icon: Truck,       title: "Delivery mismo día",        desc: "Pedís antes de las 14hs y lo tenés en el día. CABA y GBA." },
  { icon: ShieldCheck, title: "Frescura garantizada",       desc: "Todos los cortes son faenados el mismo día. Nada de freezado." },
  { icon: Award,       title: "20 años de trayectoria",    desc: "Desde 2004 en el barrio de Palermo, sirviendo a miles de familias." },
  { icon: Star,        title: "Calidad premium",            desc: "Sólo trabajamos con proveedores certificados. Razas selectas." },
];

export default function Home() {
  useReveal();
  const featured = products.slice(0, 4);

  return (
    <main id="home-page">

      {/* ======= HERO ======= */}
      <section className="hero" id="hero" aria-label="Hero">
        <div className="hero-bg">
          <div className="hero-bg-img" />
          <div className="hero-bg-overlay" />
        </div>
        <div className="hero-stripe" aria-hidden="true" />

        <div className="hero-content">
          <div className="hero-eyebrow">
            Buenos Aires · Argentina · Desde 2004
          </div>

          <h1 className="hero-title">
            La Mejor
            <span className="accent">Carne</span>
            de Argentina
          </h1>

          <p className="hero-subtitle">
            Cortes premium seleccionados a mano, con más de 20 años de tradición.
            Delivery a todo Buenos Aires. Calidad garantizada.
          </p>

          <div className="hero-actions">
            <Link to="/shop" className="btn btn-primary btn-lg" id="hero-shop-btn">
              Ver Tienda <ArrowRight size={18} />
            </Link>
            <button
              className="btn btn-ghost btn-lg"
              onClick={() => document.getElementById("promos")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Flame size={17} /> Ver Promociones
            </button>
          </div>

          <div className="hero-stats">
            {[
              { val: "20", suf: "+", label: "Años de trayectoria" },
              { val: "15", suf: "k", label: "Clientes satisfechos" },
              { val: "60", suf: "+", label: "Cortes disponibles" },
              { val: "4.9", suf: "★", label: "Calificación promedio" },
            ].map(({ val, suf, label }) => (
              <div key={label}>
                <div className="hero-stat-value">{val}<span>{suf}</span></div>
                <div className="hero-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= PROMOS DESTACADAS ======= */}
      <section className="promos-section section" id="promos" aria-label="Promociones destacadas">
        <div className="container">
          <div className="reveal">
            <span className="section-eyebrow">Ofertas de la semana</span>
            <h2 className="section-title">
              Promos que no<br /><span>podés perder</span>
            </h2>
          </div>

          <div className="featured-promos-grid" style={{ marginTop: 40 }}>
            {promos.map((p, i) => (
              <article
                key={p.id}
                className={`featured-promo-card reveal`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="featured-promo-icon">{p.icon}</div>
                <h3 className="featured-promo-title">{p.title}</h3>
                <p className="featured-promo-desc">{p.desc}</p>
                <Link to="/shop" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", marginTop: "auto" }}>
                  Ver en tienda <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ======= BANK PROMOS ======= */}
      <section className="section" style={{ background: "var(--bg)", paddingTop: 40 }} aria-label="Descuentos bancarios">
        <div className="container">
          <div className="reveal">
            <span className="section-eyebrow">Descuentos bancarios</span>
            <h2 className="section-title">
              Pagá menos con<br /><span>tu banco</span>
            </h2>
          </div>

          <div className="bank-promos-grid reveal" style={{ marginTop: 40, textAlign: 'center' }}>
            {banks.map((b) => (
              <div
                key={b.abbr}
                className="bank-card"
                style={{ "--bank-color": b.color, alignItems: 'center' }}
              >
                {b.img ? (
                  <img src={b.img} alt={b.name} style={{ height: '70px', objectFit: 'contain', marginBottom: '12px' }} />
                ) : (
                  <span
                    className="bank-abbr-badge"
                    style={{ color: b.color, borderColor: b.color + "55", background: b.color + "18" }}
                  >
                    {b.abbr}
                  </span>
                )}
                <div className="bank-discount">
                  {b.discount}<span> OFF</span>
                </div>
                <div className="bank-name">{b.name}</div>
                <div className="bank-deal">{b.deal}</div>
                <div className="bank-day">{b.days}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= PRODUCTOS DESTACADOS ======= */}
      <section className="section" style={{ background: "var(--bg-2)" }} aria-label="Productos destacados">
        <div className="container">
          <div className="reveal" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 40 }}>
            <div>
              <span className="section-eyebrow">Selección de la casa</span>
              <h2 className="section-title">
                Cortes<br /><span>Destacados</span>
              </h2>
            </div>
            <Link to="/shop" className="btn btn-ghost">
              Ver todo el catálogo <ArrowRight size={16} />
            </Link>
          </div>

          <div className="product-grid reveal">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ======= POR QUÉ ELEGIRNOS ======= */}
      <section className="nosotros-section section" id="nosotros" aria-label="Por qué elegirnos">
        <div className="container">
          <div className="reveal">
            <span className="section-eyebrow">Por qué elegirnos</span>
            <h2 className="section-title">
              La tradición que<br /><span>nos distingue</span>
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "1rem", maxWidth: 560, marginTop: 14, fontStyle: "italic" }}>
              Más de dos décadas de compromiso con la calidad, la frescura y la atención personalizada.
              Cada corte que llega a tu mesa pasó por nuestras manos.
            </p>
          </div>

          <div className="features-grid reveal" style={{ marginTop: 48 }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="feature-card">
                <div className="feature-icon">
                  <Icon size={22} />
                </div>
                <div className="feature-title">{title}</div>
                <div className="feature-desc">{desc}</div>
              </div>
            ))}
          </div>

          <div className="reveal" style={{ marginTop: 56, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <Link to="/shop" className="btn btn-primary btn-lg">
              Explorar tienda <ArrowRight size={18} />
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: "0.88rem", fontStyle: "italic" }}>
              <Clock size={16} style={{ color: "var(--red)" }} />
              Lun–Sáb 8:00–21:00 · Dom 10:00–20:00
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
