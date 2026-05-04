import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  ChevronDown,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [categories, setCategories] = useState([]);
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
    let cancelled = false;
    supabase
      .from("products")
      .select("category")
      .eq("active", true)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const unique = [...new Set(data.map((p) => p.category).filter(Boolean))];
        unique.sort((a, b) => a.localeCompare(b, "es"));
        setCategories(unique);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileShopOpen(false);
    setShopOpen(false);
  }, [location]);

  const isActive = (path) => (location.pathname === path ? "active" : "");

  const handleInicio = () => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* Si estamos en otra ruta, primero navegamos a home y luego hacemos scroll */
  const scrollToHash = (hash) => {
    const el = document.getElementById(hash);
    if (!el) return;
    const navbarHeight = document.getElementById("main-navbar")?.offsetHeight ?? 80;
    const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const handleHashLink = (hash) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => scrollToHash(hash), 150);
    } else {
      scrollToHash(hash);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isDashboardAdmin) return null;

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`} id="main-navbar">
        <div className="navbar-inner">
          <Link to="/" className="nav-logo" id="nav-logo">
            <img
              src="https://gfjkhzudkctakwcyqmmj.supabase.co/storage/v1/object/public/logo/logoLaVacaRoja.png"
              alt="La Vaca Roja"
              style={{
                height: "110px",
                width: "auto",
                objectFit: "contain",
                marginTop: "3px",
                marginBottom: "3px",
              }}
            />
          </Link>

          {!isDashboardAdmin && (
            <ul className="nav-links">
              <li>
                <button className="nav-link-btn" onClick={handleInicio}>
                  Inicio
                </button>
              </li>
              <li
                className="nav-shop-item"
                onMouseEnter={() => setShopOpen(true)}
                onMouseLeave={() => setShopOpen(false)}
              >
                <Link
                  to="/shop"
                  className={`nav-shop-trigger ${isActive("/shop")}`}
                >
                  Tienda
                  {categories.length > 0 && (
                    <ChevronDown
                      size={14}
                      className={`nav-shop-caret ${shopOpen ? "open" : ""}`}
                    />
                  )}
                </Link>
                {shopOpen && categories.length > 0 && (
                  <ul className="nav-submenu">
                    <li>
                      <Link to="/shop" className="nav-submenu-all">
                        Ver todos
                      </Link>
                    </li>
                    {categories.map((cat) => (
                      <li key={cat}>
                        <Link to={`/shop?cat=${encodeURIComponent(cat)}`}>
                          {cat}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              <li>
                <button
                  className="nav-link-btn"
                  onClick={() => handleHashLink("promos")}
                >
                  Promociones
                </button>
              </li>
              <li>
                <button
                  className="nav-link-btn"
                  onClick={() => handleHashLink("nosotros")}
                >
                  Nosotros
                </button>
              </li>
            </ul>
          )}

          {!isDashboardAdmin && (
            <>
              <div className="nav-actions">
                {user ? (
                  <div className="nav-user-menu">
                    <Link
                      to="/dashboard"
                      className="nav-user-btn"
                      title="Mi cuenta"
                    >
                      <User size={15} />
                      <span>
                        {profile?.full_name?.split(" ")[0] || "Mi cuenta"}
                      </span>
                      {isAdmin && (
                        <span className="nav-admin-badge">Admin</span>
                      )}
                    </Link>
                    <button
                      className="nav-signout-btn"
                      onClick={handleSignOut}
                      title="Cerrar sesión"
                    >
                      <LogOut size={15} />
                    </button>
                  </div>
                ) : (
                  <Link to="/login" className="nav-login-btn">
                    <User size={15} />
                    <span>Ingresar</span>
                  </Link>
                )}

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
              </div>

              <button
                className="nav-hamburger"
                id="nav-hamburger"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Menú móvil"
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </>
          )}
        </div>
      </nav>

      <div
        className={`nav-mobile-menu ${mobileOpen ? "open" : ""}`}
        id="nav-mobile-menu"
      >
        {!isDashboardAdmin && (
          <>
            <button className="nav-mobile-link-btn" onClick={handleInicio}>
              🏠 Inicio
            </button>
            {categories.length > 0 ? (
              <>
                <button
                  className="nav-mobile-link-btn nav-mobile-shop-toggle"
                  onClick={() => setMobileShopOpen((o) => !o)}
                  aria-expanded={mobileShopOpen}
                >
                  <span>🛒 Tienda</span>
                  <ChevronDown
                    size={16}
                    className={`nav-shop-caret ${mobileShopOpen ? "open" : ""}`}
                  />
                </button>
                {mobileShopOpen && (
                  <div className="nav-mobile-submenu">
                    <Link to="/shop" className="nav-mobile-submenu-link">
                      Ver todos
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat}
                        to={`/shop?cat=${encodeURIComponent(cat)}`}
                        className="nav-mobile-submenu-link"
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link to="/shop" className={isActive("/shop")}>
                🛒 Tienda
              </Link>
            )}
            <button
              className="nav-mobile-link-btn"
              onClick={() => handleHashLink("promos")}
            >
              🔥 Promociones
            </button>
            <button
              className="nav-mobile-link-btn"
              onClick={() => handleHashLink("nosotros")}
            >
              ⭐ Nosotros
            </button>
          </>
        )}
        {user ? (
          <>
            {!isDashboardAdmin && (
              <Link to="/dashboard" className="nav-mobile-dashboard-link">
                <LayoutDashboard size={16} />
                {isAdmin ? "Panel Admin" : "Mi cuenta"}
              </Link>
            )}
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
            onClick={() => {
              setDrawerOpen(true);
              setMobileOpen(false);
            }}
          >
            <ShoppingCart size={16} /> Ver carrito {count > 0 && `(${count})`}
          </button>
        )}
      </div>
    </>
  );
}
