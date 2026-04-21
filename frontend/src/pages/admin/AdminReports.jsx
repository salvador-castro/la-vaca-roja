import { useState, useEffect } from "react";
import {
  ShoppingBag, Package, Users, TrendingUp,
  Clock, CheckCircle, XCircle, Truck,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(p ?? 0);

const statusMap = {
  pending: { label: "Pendiente", icon: Clock, color: "#f5a623" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "#4caf50" },
  preparing: { label: "Preparando", icon: Package, color: "#2196f3" },
  delivered: { label: "Entregado", icon: Truck, color: "#8bc34a" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "#f44336" },
};

export default function AdminReports() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [ordersRes, productsRes, usersRes, itemsRes] = await Promise.all([
      supabase.from("orders").select("id, status, total, created_at"),
      supabase.from("products").select("id, active"),
      supabase.from("profiles").select("id, role, created_at"),
      supabase.from("order_items").select("product_name, quantity, line_total"),
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const users = usersRes.data || [];

    const totalRevenue = orders
      .filter((o) => o.status === "delivered")
      .reduce((s, o) => s + (o.total || 0), 0);

    const pending = orders.filter((o) => o.status === "pending").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;

    setStats({
      totalOrders: orders.length,
      totalRevenue,
      activeProducts: products.filter((p) => p.active).length,
      totalUsers: users.filter((u) => u.role === "cliente").length,
      pendingOrders: pending,
      deliveredOrders: delivered,
    });

    setRecentOrders(
      orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 8)
    );

    setLoading(false);
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
      sub: "Pedidos entregados",
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

      {/* Status breakdown */}
      <div className="admin-section-header" style={{ marginTop: 32 }}>
        <h2>Estado de pedidos</h2>
      </div>
      <div className="admin-status-grid">
        {Object.entries(statusMap).map(([key, { label, icon: Icon, color }]) => {
          const count = recentOrders.filter((o) => o.status === key).length;
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
