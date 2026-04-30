import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  BadgeCheck,
  RefreshCw,
  User,
  Save,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  shipping: { label: "Enviando", icon: Truck, color: "#9c27b0" },
  delivered: { label: "Entregado", icon: BadgeCheck, color: "#8bc34a" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "#f44336" },
};

export default function ClientDashboard() {
  const { user, profile, updateProfile } = useAuth();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        email: user?.email || "",
      });
    }
  }, [profile, user]);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setOrdersLoading(false);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    const { error } = await updateProfile({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
      email: profileForm.email,
    });
    setProfileSaving(false);
    if (error) {
      setProfileMsg({
        type: "error",
        text: error.message || "Error al guardar los datos.",
      });
    } else {
      const emailChanged = profileForm.email !== user?.email;
      setProfileMsg({
        type: "ok",
        text: emailChanged
          ? "Datos guardados. Revisá tu nuevo email para confirmar el cambio de dirección."
          : "Datos actualizados correctamente.",
      });
    }
  };

  const handleRetryPayment = async (orderId) => {
    setActionLoading(orderId + "_retry");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/payment/retry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al reintentar el pago");
      const useSandbox =
        import.meta.env.DEV || import.meta.env.VITE_MP_SANDBOX === "true";
      window.location.href = useSandbox
        ? data.sandbox_init_point
        : data.init_point;
    } catch (err) {
      alert(err.message);
      setActionLoading(null);
    }
  };

  const handleCancel = async (orderId) => {
    if (!confirm("¿Cancelar este pedido?")) return;
    setActionLoading(orderId + "_cancel");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cancelar el pedido");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)),
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <main className="client-dashboard">
      <div
        className="container"
        style={{ paddingTop: "calc(var(--nav-h) + 40px)", paddingBottom: 80 }}
      >
        {/* Header */}
        <div className="client-dash-header">
          <div className="client-avatar">
            {profile?.full_name?.[0]?.toUpperCase() ||
              user?.email?.[0]?.toUpperCase() ||
              "U"}
          </div>
          <div>
            <h1 className="client-dash-greeting">
              Hola,{" "}
              <span>{profile?.full_name?.split(" ")[0] || "cliente"}</span>
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
            <strong>
              {orders.filter((o) => o.status === "pending").length}
            </strong>
            <span>Pendientes</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="client-tabs">
          <button
            className={`client-tab${tab === "orders" ? " active" : ""}`}
            onClick={() => setTab("orders")}
          >
            <Package size={16} /> Mis pedidos
          </button>
          <button
            className={`client-tab${tab === "profile" ? " active" : ""}`}
            onClick={() => setTab("profile")}
          >
            <User size={16} /> Mis datos
          </button>
        </div>

        {/* Orders tab */}
        {tab === "orders" &&
          (ordersLoading ? (
            <div className="admin-loading">
              <div className="auth-loading-spinner" />
            </div>
          ) : orders.length === 0 ? (
            <div className="client-empty-orders">
              <ShoppingBag size={48} opacity={0.3} />
              <h3>Todavía no hiciste pedidos</h3>
              <p>
                Explorá nuestra tienda y encontrá los mejores cortes de carne.
              </p>
              <Link
                to="/shop"
                className="btn btn-primary"
                style={{ marginTop: 16 }}
              >
                Ver tienda
              </Link>
            </div>
          ) : (
            <div className="client-orders-list">
              {orders.map((order) => {
                const {
                  label,
                  icon: Icon,
                  color,
                } = statusMap[order.status] || {
                  label: order.status,
                  icon: Clock,
                  color: "#888",
                };
                return (
                  <div key={order.id} className="client-order-card">
                    <div className="client-order-header">
                      <span className="client-order-id">
                        Pedido #{order.id}
                      </span>
                      <span
                        className="admin-status-pill"
                        style={{ color, borderColor: color }}
                      >
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
                              <span className="client-order-variant">
                                {item.variant_name}
                              </span>
                            )}
                            <span className="client-order-qty">
                              x{item.quantity}
                            </span>
                            <span>{formatPrice(item.line_total)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="client-order-footer">
                      <span>Total</span>
                      <strong>{formatPrice(order.total)}</strong>
                    </div>

                    {order.status === "pending" && (
                      <div className="client-order-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionLoading !== null}
                          onClick={() => handleRetryPayment(order.id)}
                        >
                          <RefreshCw size={14} />
                          {actionLoading === order.id + "_retry"
                            ? "Redirigiendo…"
                            : "Reintentar pago"}
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={actionLoading !== null}
                          onClick={() => handleCancel(order.id)}
                        >
                          {actionLoading === order.id + "_cancel"
                            ? "Cancelando…"
                            : "Cancelar pedido"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

        {/* Profile tab */}
        {tab === "profile" && (
          <div className="client-profile-form-wrap">
            <form onSubmit={handleProfileSave} className="client-profile-form">
              {profileMsg && (
                <div className={`client-profile-msg ${profileMsg.type}`}>
                  <AlertCircle size={15} />
                  {profileMsg.text}
                </div>
              )}

              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Nombre completo</label>
                  <input
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm((f) => ({
                        ...f,
                        full_name: e.target.value,
                      }))
                    }
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div className="auth-field">
                  <label>Teléfono</label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="Ej: +54 11 1234-5678"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="tu@email.com"
                />
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                    fontStyle: "italic",
                  }}
                >
                  Si cambiás el email, recibirás un link de confirmación en la
                  nueva dirección.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={profileSaving}
                >
                  {profileSaving ? (
                    <span className="btn-spinner" />
                  ) : (
                    <>
                      <Save size={15} /> Guardar cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
