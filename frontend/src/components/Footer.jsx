import { Link, useLocation, useNavigate } from "react-router-dom";
import { MapPin, Phone, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const IgIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FbIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const handleInicio = () => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (location.pathname === "/dashboard" && isAdmin) {
    return null;
  }

  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <div className="footer-brand-logo">
              <img 
                src="https://gfjkhzudkctakwcyqmmj.supabase.co/storage/v1/object/public/logo/logoLaVacaRoja.png" 
                alt="La Vaca Roja" 
                style={{ height: '90px', width: 'auto', objectFit: 'contain' }} 
              />
            </div>
            <p className="footer-desc">
              Más de 20 años llevando los mejores cortes a tu mesa. Calidad
              premium, atención personalizada y la tradición de la mejor
              carnicería argentina.
            </p>
            <div
              style={{
                marginTop: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                }}
              >
                <MapPin
                  size={14}
                  style={{ color: "var(--red)", flexShrink: 0 }}
                />
                <span>Gascón 801, CABA</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                }}
              >
                <Phone
                  size={14}
                  style={{ color: "var(--red)", flexShrink: 0 }}
                />
                <span>+54 11 6687-4595</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                }}
              >
                <Clock
                  size={14}
                  style={{ color: "var(--red)", flexShrink: 0 }}
                />
                <span>Lun–Sáb: 8:00 – 21:00 | Dom-Fer: 10:00 – 20:00</span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <div>
            <div className="footer-col-title">Navegación</div>
            <ul className="footer-links">
              <li>
                <button className="footer-link-btn" onClick={handleInicio}>Inicio</button>
              </li>
              <li>
                <Link to="/shop">Tienda</Link>
              </li>
              <li>
                <a href="#promos">Promociones</a>
              </li>
              <li>
                <a href="#nosotros">Nosotros</a>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <div className="footer-col-title">Categorías</div>
            <ul className="footer-links">
              <li>
                <Link to="/shop?cat=Vacuno">Vacuno</Link>
              </li>
              <li>
                <Link to="/shop?cat=Cerdo">Cerdo</Link>
              </li>
              <li>
                <Link to="/shop?cat=Pollo">Pollo</Link>
              </li>
              <li>
                <Link to="/shop?cat=Embutidos">Embutidos</Link>
              </li>
              <li>
                <Link to="/shop?cat=Hamburguesas">Hamburguesas</Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="footer-col-title">Información</div>
            <ul className="footer-links">
              <li>
                <a href="#">Términos y condiciones</a>
              </li>
              <li>
                <a href="#">Política de privacidad</a>
              </li>
              <li>
                <a href="#">Medios de pago</a>
              </li>
              <li>
                <a href="#">Envíos y delivery</a>
              </li>
              <li>
                <a href="#">Contacto</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} La Vaca Roja. Todos los derechos
            reservados. Diseñado por <a class="mail" target="_blank" href="https://salvadorcastro.vercel.app/">salvaCastro</a>
          </p>
          <div className="footer-socials">
            <a
              href="https://instagram.com/lavacaroja"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn"
              aria-label="Instagram"
            >
              <IgIcon />
            </a>
            <a
              href="https://facebook.com/lavacaroja"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn"
              aria-label="Facebook"
            >
              <FbIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
