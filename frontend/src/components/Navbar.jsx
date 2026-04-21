import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count, setDrawerOpen } = useCart();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`} id="main-navbar">
        <div className="navbar-inner">
          <Link to="/" className="nav-logo" id="nav-logo">
            <div className="nav-logo-icon">🥩</div>
            <span className="nav-logo-text">
              La Vaca<span> Roja</span>
            </span>
          </Link>

          <ul className="nav-links">
            <li>
              <Link to="/" className={isActive("/")}>
                Inicio
              </Link>
            </li>
            <li>
              <Link to="/shop" className={isActive("/shop")}>
                Tienda
              </Link>
            </li>
            <li>
              <a href="#promos">Promociones</a>
            </li>
            <li>
              <a href="#nosotros">Nosotros</a>
            </li>
          </ul>

          <button
            className="nav-cart-btn"
            id="nav-cart-button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={16} strokeWidth={2.5} />
            <span>Carrito</span>
            {count > 0 && (
              <span className="nav-cart-badge" key={count}>
                {count}
              </span>
            )}
          </button>

          <button
            className="nav-hamburger"
            id="nav-hamburger"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menú móvil"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <div
        className={`nav-mobile-menu ${mobileOpen ? "open" : ""}`}
        id="nav-mobile-menu"
      >
        <Link to="/" className={isActive("/")}>
          🏠 Inicio
        </Link>
        <Link to="/shop" className={isActive("/shop")}>
          🛒 Tienda
        </Link>
        <a href="#promos">🔥 Promociones</a>
        <a href="#nosotros">⭐ Nosotros</a>
        <button
          className="btn btn-primary"
          style={{ marginTop: 8 }}
          onClick={() => {
            setDrawerOpen(true);
            setMobileOpen(false);
          }}
        >
          <ShoppingCart size={16} /> Ver carrito {count > 0 && `(${count})`}
        </button>
      </div>
    </>
  );
}
