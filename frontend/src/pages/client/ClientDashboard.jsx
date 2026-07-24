import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag, Package, Clock, CheckCircle, XCircle,
  Truck, BadgeCheck, RefreshCw, User, Save, AlertCircle,
  MapPin,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(p ?? 0);

const statusMap = {
  pending:   { label: "Pago pendiente",   icon: Clock,       color: "#f5a623" },
  confirmed: { label: "Pago confirmado",  icon: CheckCircle, color: "#4caf50" },
  preparing: { label: "Preparando",       icon: Package,     color: "#2196f3" },
  shipping:  { label: "Enviando",         icon: Truck,       color: "#9c27b0" },
  delivered: { label: "Entregado",        icon: BadgeCheck,  color: "#8bc34a" },
  cancelled: { label: "Cancelado",        icon: XCircle,     color: "#f44336" },
};

// El cliente puede pedir cancelación/devolución en estos estados
const CANCELLABLE_STATUSES = ["pending", "confirmed", "preparing"];

// Bounding box de CABA (west,north,east,south) para acotar el autocomplete de Nominatim a la zona de envío
const CABA_VIEWBOX = "-58.5315,-34.5265,-58.3350,-34.7052";

export default function ClientDashboard() {
  const { user, profile, updateProfile } = useAuth();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [profileForm, setProfileForm] = useState({
    full_name: "", phone: "", email: "", address: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressDebounceRef = useRef(null);
  const addressAbortRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        email: user?.email || "",
        address: profile.address || "",
      });
    }
  }, [profile, user]);

  useEffect(() => { fetchOrders(); }, [user]);

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

  const handleAddressChange = (value) => {
    setProfileForm((f) => ({ ...f, address: value }));

    clearTimeout(addressDebounceRef.current);
    if (value.trim().length < 5) {
      setAddressSuggestions([]);
      return;
    }

    addressDebounceRef.current = setTimeout(async () => {
      addressAbortRef.current?.abort();
      const controller = new AbortController();
      addressAbortRef.current = controller;
      try {
        const params = new URLSearchParams({
          format: "json",
          addressdetails: "1",
          countrycodes: "ar",
          viewbox: CABA_VIEWBOX,
          bounded: "1",
          limit: "5",
          q: value,
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setAddressSuggestions(data || []);
        setShowAddressSuggestions(true);
      } catch (err) {
        if (err.name !== "AbortError") setAddressSuggestions([]);
      }
    }, 450);
  };

  const handleAddressSelect = (suggestion) => {
    setProfileForm((f) => ({ ...f, address: suggestion.display_name }));
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    const { error } = await updateProfile({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
      email: profileForm.email,
      address: profileForm.address,
    });
    setProfileSaving(false);
    if (error) {
      setProfileMsg({ type: "error", text: error.message || "Error al guardar los datos." });
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
      const { data: { session } } = await supabase.auth.getSession();
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
      const useSandbox = import.meta.env.DEV || import.meta.env.VITE_MP_SANDBOX === "true";
      window.location.href = useSandbox ? data.sandbox_init_point : data.init_point;
    } catch (err) {
      alert(err.message);
      setActionLoading(null);
    }
  };

  const handleCancel = async (orderId, isPaid) => {
    const msg = isPaid
      ? "¿Solicitar devolución de este pedido? El equipo se pondrá en contacto para gestionar el reembolso."
      : "¿Cancelar este pedido?";
    if (!confirm(msg)) return;

    setActionLoading(orderId + "_cancel");
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
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
            <span>Pendientes de pago</span>
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
        {tab === "orders" && (
          ordersLoading ? (
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
                const isPaid = ["confirmed", "preparing"].includes(order.status);
                const canCancel = CANCELLABLE_STATUSES.includes(order.status);

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

                    {order.notes && (
                      <div
                        style={{
                          margin: "8px 0",
                          padding: "8px 12px",
                          background: "var(--surface)",
                          borderRadius: "var(--radius)",
                          fontSize: "0.8rem",
                          color: "var(--muted)",
                          fontStyle: "italic",
                        }}
                      >
                        💬 {order.notes}
                      </div>
                    )}

                    <div className="client-order-footer">
                      <span>Total</span>
                      <strong>{formatPrice(order.total)}</strong>
                    </div>

                    {canCancel && (
                      <div className="client-order-actions">
                        {order.status === "pending" && (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={actionLoading !== null}
                            onClick={() => handleRetryPayment(order.id)}
                          >
                            <RefreshCw size={14} />
                            {actionLoading === order.id + "_retry" ? "Redirigiendo…" : "Reintentar pago"}
                          </button>
                        )}
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={actionLoading !== null}
                          onClick={() => handleCancel(order.id, isPaid)}
                        >
                          {actionLoading === order.id + "_cancel"
                            ? "Procesando…"
                            : isPaid
                            ? "Solicitar devolución"
                            : "Cancelar pedido"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

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
                    onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Ej: +54 11 1234-5678"
                    pattern="^\+?[0-9\s\-]{6,20}$"
                    title="Ingresá un teléfono válido (solo números, espacios, guiones y +)"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tu@email.com"
                  required
                />
                <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                  Si cambiás el email, recibirás un link de confirmación en la nueva dirección.
                </span>
              </div>

              <div className="auth-field">
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={14} /> Dirección de envío
                </label>
                <div className="address-autocomplete-wrap">
                  <input
                    value={profileForm.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => addressSuggestions.length > 0 && setShowAddressSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 150)}
                    placeholder="Ej: Av. Corrientes 1234, CABA"
                    autoComplete="off"
                    required
                  />
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <ul className="address-suggestions">
                      {addressSuggestions.map((s) => (
                        <li key={s.place_id}>
                          <button type="button" onMouseDown={() => handleAddressSelect(s)}>
                            <MapPin size={13} />
                            <span>{s.display_name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                  Necesaria para recibir pedidos a domicilio.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                  {profileSaving ? <span className="btn-spinner" /> : <><Save size={15} /> Guardar cambios</>}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
