import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Tag, Users, Ticket,
  BarChart2, LogOut, Menu, X, ChevronRight, ShoppingCart, SlidersHorizontal, FolderOpen,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AdminProducts from "./AdminProducts";
import AdminPromotions from "./AdminPromotions";
import AdminCategories from "./AdminCategories";
import AdminUsers from "./AdminUsers";
import AdminCoupons from "./AdminCoupons";
import AdminOrders from "./AdminOrders";
import AdminReports from "./AdminReports";
import AdminSettings from "./AdminSettings";

const navItems = [
  { id: "reports",    label: "Resumen",       icon: LayoutDashboard },
  { id: "products",   label: "Productos",      icon: Package },
  { id: "categories", label: "Categorías",     icon: FolderOpen },
  { id: "promotions", label: "Promociones",    icon: Tag },
  { id: "users",      label: "Usuarios",       icon: Users },
  { id: "coupons",    label: "Cupones",        icon: Ticket },
  { id: "orders",     label: "Pedidos",        icon: ShoppingCart },
  { id: "settings",   label: "Configuración",  icon: SlidersHorizontal },
];

const views = {
  reports:    AdminReports,
  products:   AdminProducts,
  categories: AdminCategories,
  promotions: AdminPromotions,
  users:      AdminUsers,
  coupons:    AdminCoupons,
  orders:     AdminOrders,
  settings:   AdminSettings,
};

export default function AdminLayout() {
  const [active, setActive] = useState("reports");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const ActiveView = views[active] || AdminReports;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-header">
          <Link to="/" className="admin-brand">
            <img 
              src="https://gfjkhzudkctakwcyqmmj.supabase.co/storage/v1/object/public/logo/logoLaVacaRoja.png" 
              alt="La Vaca Roja" 
              style={{ height: '50px', width: 'auto', objectFit: 'contain' }} 
            />
          </Link>
          <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">
            {profile?.full_name?.[0]?.toUpperCase() || "A"}
          </div>
          <div>
            <p className="admin-profile-name">{profile?.full_name || "Administrador"}</p>
            <span className="admin-role-badge">Admin</span>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`admin-nav-item ${active === id ? "active" : ""}`}
              onClick={() => { setActive(id); setSidebarOpen(false); }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {active === id && <ChevronRight size={14} className="admin-nav-arrow" />}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/shop" className="admin-nav-item">
            <Package size={18} />
            <span>Ver tienda</span>
          </Link>
          <button className="admin-nav-item admin-signout" onClick={handleSignOut}>
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <h1 className="admin-topbar-title">
            {navItems.find((n) => n.id === active)?.label || "Dashboard"}
          </h1>
          <span className="admin-topbar-badge">Panel Admin</span>
        </header>

        <div className="admin-content">
          <ActiveView />
        </div>
      </div>
    </div>
  );
}
