import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count, setDrawerOpen } = useCart();
  const { user, profile, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboardAdmin = location.pathname === "/dashboard" && isAdmin;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isActive = (path) => (location.pathname === path ? "active" : "");

  /* Si estamos en otra ruta, primero navegamos a home y luego hacemos scroll */
  const handleHashLink = (hash) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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
              <Link to="/" className={isActive("/")}>Inicio</Link>
            </li>
            <li>
              <Link to="/shop" className={isActive("/shop")}>Tienda</Link>
            </li>
            <li>
              <button className="nav-link-btn" onClick={() => handleHashLink("promos")}>
                Promociones
              </button>
            </li>
            <li>
              <button className="nav-link-btn" onClick={() => handleHashLink("nosotros")}>
                Nosotros
              </button>
            </li>
          </ul>

          <div className="nav-actions">
            {user ? (
              <div className="nav-user-menu">
                <Link to="/dashboard" className="nav-user-btn" title="Mi cuenta">
                  <User size={15} />
                  <span>{profile?.full_name?.split(" ")[0] || "Mi cuenta"}</span>
                  {isAdmin && <span className="nav-admin-badge">Admin</span>}
                </Link>
                <button className="nav-signout-btn" onClick={handleSignOut} title="Cerrar sesión">
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="nav-login-btn">
                <User size={15} />
                <span>Ingresar</span>
              </Link>
            )}

            {!isDashboardAdmin && (
              <button
                className="nav-cart-btn"
                id="nav-cart-button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Abrir carrito"
              >
                <ShoppingCart size={16} strokeWidth={2.5} />
                <span>Carrito</span>
                {count > 0 && (
                  <span className="nav-cart-badge" key={count}>{count}</span>
                )}
              </button>
            )}
          </div>

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

      <div className={`nav-mobile-menu ${mobileOpen ? "open" : ""}`} id="nav-mobile-menu">
        <Link to="/" className={isActive("/")}>🏠 Inicio</Link>
        <Link to="/shop" className={isActive("/shop")}>🛒 Tienda</Link>
        <button className="nav-mobile-link-btn" onClick={() => handleHashLink("promos")}>
          🔥 Promociones
        </button>
        <button className="nav-mobile-link-btn" onClick={() => handleHashLink("nosotros")}>
          ⭐ Nosotros
        </button>
        {user ? (
          <>
            <Link to="/dashboard" className="nav-mobile-dashboard-link">
              <LayoutDashboard size={16} />
              {isAdmin ? "Panel Admin" : "Mi cuenta"}
            </Link>
            <button className="nav-mobile-signout" onClick={handleSignOut}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-mobile-login">
            <User size={16} /> Ingresar / Registrarse
          </Link>
        )}
        {!isDashboardAdmin && (
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => { setDrawerOpen(true); setMobileOpen(false); }}
          >
            <ShoppingCart size={16} /> Ver carrito {count > 0 && `(${count})`}
          </button>
        )}
      </div>
    </>
  );
}
