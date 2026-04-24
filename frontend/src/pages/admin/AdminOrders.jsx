import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Pencil, X, Check, Search } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const STATUS_OPTS = ["pending", "confirmed", "preparing", "shipping", "delivered", "cancelled"];
const STATUS_LABELS = {
  pending:   "Pendiente",
  confirmed: "Pago confirmado",
  preparing: "Preparando",
  shipping:  "Enviando",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_COLORS = {
  pending:   "#f5a623",
  confirmed: "#4caf50",
  preparing: "#2196f3",
  shipping:  "#9c27b0",
  delivered: "#8bc34a",
  cancelled: "#f44336",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  // Filtros
  const [filterStatus, setFilterStatus] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al cargar pedidos");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (o) => {
    setModal(o);
    setNewStatus(o.status);
  };

  const updateStatus = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await fetch(`${API_URL}/api/orders/${modal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Error updating order status:", err);
    } finally {
      setSaving(false);
      setModal(null);
      fetchOrders();
    }
  };

  const clearFilters = () => {
    setFilterStatus("");
    setFilterClient("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const hasFilters = filterStatus || filterClient || filterDateFrom || filterDateTo;

  const filteredOrders = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false;
    const name = (o.profiles?.full_name || o.profiles?.email || "").toLowerCase();
    if (filterClient && !name.includes(filterClient.toLowerCase())) return false;
    if (filterDateFrom && new Date(o.created_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(o.created_at) > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  });

  const formatPrice = (p) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(p ?? 0);

  const inputStyle = {
    padding: "8px 12px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: "0.85rem",
    outline: "none",
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Pedidos</h2>
          <p>
            {filteredOrders.length} de {orders.length} pedidos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={14} style={{ position: "absolute", left: 10, color: "var(--muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 30, minWidth: 180 }}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={inputStyle}
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>Desde</span>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>Hasta</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={inputStyle}
          />
        </div>

        {hasFilters && (
          <button className="btn btn-ghost" onClick={clearFilters} style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
            <X size={14} /> Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="admin-loading"><div className="auth-loading-spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    {hasFilters ? "No hay pedidos con esos filtros" : "No hay pedidos"}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const color = STATUS_COLORS[o.status] || "#888";
                  return (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>
                        {o.profiles?.full_name || o.profiles?.email ||
                          (o.user_id ? "Usuario " + String(o.user_id).substring(0, 6) : "Anónimo")}
                      </td>
                      <td>{new Date(o.created_at).toLocaleString("es-AR")}</td>
                      <td>{formatPrice(o.total)}</td>
                      <td>
                        <span
                          className="admin-status-pill"
                          style={{ color, borderColor: color }}
                        >
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                      </td>
                      <td className="admin-table-actions">
                        <button
                          className="admin-action-btn edit"
                          onClick={() => openStatusModal(o)}
                          title="Cambiar Estado"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Pedido #{modal.id}</h3>
              <button className="admin-modal-close" onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </div>

            <p className="admin-table-muted" style={{ marginBottom: 15 }}>
              Cliente:{" "}
              <strong>{modal.profiles?.full_name || modal.profiles?.email || "—"}</strong>
            </p>

            <form onSubmit={updateStatus} className="admin-form">
              <div className="auth-field">
                <label>Estado del pedido</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  {STATUS_OPTS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="btn-spinner" /> : <><Check size={16} /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
