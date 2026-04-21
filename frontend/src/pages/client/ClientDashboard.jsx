import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, User, Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(p ?? 0);

const statusMap = {
  pending: { label: "Pendiente", icon: Clock, color: "#f5a623" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "#4caf50" },
  preparing: { label: "Preparando", icon: Package, color: "#2196f3" },
  delivered: { label: "Entregado", icon: Truck, color: "#8bc34a" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "#f44336" },
};

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = null;

  useEffect(() => { fetchOrders(); }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  return (
    <main className="client-dashboard">
      <div className="container" style={{ paddingTop: "calc(var(--nav-h) + 40px)", paddingBottom: 80 }}>
        {/* Header */}
        <div className="client-dash-header">
          <div className="client-avatar">
            {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h1 className="client-dash-greeting">
              Hola, <span>{profile?.full_name?.split(" ")[0] || "cliente"}</span>
            </h1>
            <p className="client-dash-email">{user?.email}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="client-quick-actions">
          <Link to="/shop" className="client-action-card">
            <ShoppingBag size={28} />
            <span>Ir a la tienda</span>
          </Link>
          <div className="client-action-card client-action-stat">
            <strong>{orders.length}</strong>
            <span>Pedidos totales</span>
          </div>
          <div className="client-action-card client-action-stat">
            <strong>{orders.filter((o) => o.status === "pending").length}</strong>
            <span>Pendientes</span>
          </div>
        </div>

        {/* Orders */}
        <div className="client-section-title">
          <Package size={20} />
          Mis pedidos
        </div>

        {loading ? (
          <div className="admin-loading"><div className="auth-loading-spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="client-empty-orders">
            <ShoppingBag size={48} opacity={0.3} />
            <h3>Todavía no hiciste pedidos</h3>
            <p>Explorá nuestra tienda y encontrá los mejores cortes de carne.</p>
            <Link to="/shop" className="btn btn-primary" style={{ marginTop: 16 }}>
              Ver tienda
            </Link>
          </div>
        ) : (
          <div className="client-orders-list">
            {orders.map((order) => {
              const { label, icon: Icon, color } = statusMap[order.status] || { label: order.status, icon: Clock, color: "#888" };
              return (
                <div key={order.id} className="client-order-card">
                  <div className="client-order-header">
                    <span className="client-order-id">Pedido #{order.id}</span>
                    <span className="admin-status-pill" style={{ color, borderColor: color }}>
                      <Icon size={12} /> {label}
                    </span>
                    <span className="admin-table-date">
                      {new Date(order.created_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>

                  {order.order_items?.length > 0 && (
                    <div className="client-order-items">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="client-order-item">
                          <span>{item.product_name}</span>
                          {item.variant_name && (
                            <span className="client-order-variant">{item.variant_name}</span>
                          )}
                          <span className="client-order-qty">x{item.quantity}</span>
                          <span>{formatPrice(item.line_total)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="client-order-footer">
                    <span>Total</span>
                    <strong>{formatPrice(order.total)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
