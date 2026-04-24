import { useState, useEffect } from "react";
import {
  ShoppingBag, Package, Users, TrendingUp,
  Clock, CheckCircle, XCircle, Truck,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(p ?? 0);

const statusMap = {
  pending:   { label: "Pendiente",       icon: Clock,        color: "#f5a623" },
  confirmed: { label: "Pago confirmado", icon: CheckCircle,  color: "#4caf50" },
  preparing: { label: "Preparando",      icon: Package,      color: "#2196f3" },
  shipping:  { label: "Enviando",        icon: Truck,        color: "#9c27b0" },
  delivered: { label: "Entregado",       icon: CheckCircle,  color: "#8bc34a" },
  cancelled: { label: "Cancelado",       icon: XCircle,      color: "#f44336" },
};

export default function AdminReports() {
  const [stats, setStats] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = { Authorization: `Bearer ${token}` };

      const [ordersRes, usersRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/api/orders`, { headers }).then((r) => r.json()),
        fetch(`${API_URL}/api/users`, { headers }).then((r) => r.json()),
        supabase.from("products").select("id, active"),
      ]);

      const orders = Array.isArray(ordersRes) ? ordersRes : [];
      const users = Array.isArray(usersRes) ? usersRes : [];
      const products = productsRes.data || [];

      const totalRevenue = orders
        .filter((o) => ["confirmed", "preparing", "shipping", "delivered"].includes(o.status))
        .reduce((s, o) => s + (o.total || 0), 0);

      const pending = orders.filter((o) => o.status === "pending").length;
      const delivered = orders.filter((o) => o.status === "delivered").length;

      setStats({
        totalOrders: orders.filter((o) => o.status !== "cancelled").length,
        totalRevenue,
        activeProducts: products.filter((p) => p.active).length,
        totalUsers: users.length,
        pendingOrders: pending,
        deliveredOrders: delivered,
      });

      const sorted = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAllOrders(orders);
      setRecentOrders(sorted.slice(0, 5));
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="auth-loading-spinner" />
        <p>Cargando reportes...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Ingresos totales",
      value: formatPrice(stats?.totalRevenue),
      icon: TrendingUp,
      color: "#4caf50",
      sub: "Pedidos confirmados y entregados",
    },
    {
      label: "Total pedidos",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingBag,
      color: "var(--red)",
      sub: `${stats?.pendingOrders} pendientes`,
    },
    {
      label: "Productos activos",
      value: stats?.activeProducts ?? 0,
      icon: Package,
      color: "var(--gold)",
      sub: "En catálogo",
    },
    {
      label: "Clientes",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "#2196f3",
      sub: "Registrados",
    },
  ];

  return (
    <div className="admin-reports">
      <div className="admin-section-header">
        <h2>Resumen general</h2>
        <p>Vista general del negocio</p>
      </div>

      {/* Stat cards */}
      <div className="admin-stats-grid">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div className="admin-stat-card" key={card.label}>
              <div className="admin-stat-icon" style={{ background: `${card.color}22`, color: card.color }}>
                <Icon size={22} />
              </div>
              <div className="admin-stat-body">
                <div className="admin-stat-value">{card.value}</div>
                <div className="admin-stat-label">{card.label}</div>
                <div className="admin-stat-sub">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status breakdown — usa TODOS los pedidos */}
      <div className="admin-section-header" style={{ marginTop: 32 }}>
        <h2>Estado de pedidos</h2>
      </div>
      <div className="admin-status-grid">
        {Object.entries(statusMap).map(([key, { label, icon: Icon, color }]) => {
          const count = allOrders.filter((o) => o.status === key).length;
          return (
            <div className="admin-status-card" key={key}>
              <Icon size={18} style={{ color }} />
              <span className="admin-status-label">{label}</span>
              <span className="admin-status-count" style={{ color }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Recent orders */}
      <div className="admin-section-header" style={{ marginTop: 32 }}>
        <h2>Pedidos recientes</h2>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-table-empty">
                  No hay pedidos aún
                </td>
              </tr>
            ) : (
              recentOrders.map((o) => {
                const { label, color } = statusMap[o.status] || { label: o.status, color: "#888" };
                return (
                  <tr key={o.id}>
                    <td className="admin-table-id">#{o.id}</td>
                    <td>
                      <span className="admin-status-pill" style={{ color, borderColor: color }}>
                        {label}
                      </span>
                    </td>
                    <td>{formatPrice(o.total)}</td>
                    <td className="admin-table-date">
                      {new Date(o.created_at).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
