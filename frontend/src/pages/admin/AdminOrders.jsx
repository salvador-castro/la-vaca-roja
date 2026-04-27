import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Pencil, X, Check, Search, Eye, Download } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const STATUS_OPTS = ["pending", "confirmed", "preparing", "shipping", "delivered", "cancelled"];
const STATUS_LABELS = {
  pending:   "Pago pendiente",
  confirmed: "Pago confirmado",
  preparing: "Preparando",
  shipping:  "Enviando",
  delivered: "Entregado",
  cancelled: "Cancelado",
};
const DELIVERY_LABELS = {
  delivery: "Envío a domicilio",
  pickup:   "Retiro en local",
};

const STATUS_COLORS = {
  pending:   "#f5a623",
  confirmed: "#4caf50",
  preparing: "#2196f3",
  shipping:  "#9c27b0",
  delivered: "#8bc34a",
  cancelled: "#f44336",
};

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(p ?? 0);

function downloadOrderTxt(order) {
  const profile = order.profiles ?? {};
  const lines = [
    "=== LA VACA ROJA — DETALLE DEL PEDIDO ===",
    "",
    `Pedido #${order.id}`,
    `Fecha:    ${new Date(order.created_at).toLocaleString("es-AR")}`,
    `Estado:   ${STATUS_LABELS[order.status] || order.status}`,
    `Entrega:  ${DELIVERY_LABELS[order.delivery_method] || order.delivery_method || "—"}`,
    "",
    "--- CLIENTE ---",
    `Nombre:   ${profile.full_name || "—"}`,
    `Email:    ${profile.email || "—"}`,
    `Teléfono: ${profile.phone || "—"}`,
    `Dirección:${profile.address || "—"}`,
    "",
    "--- PRODUCTOS ---",
    ...(order.order_items ?? []).map(
      (it) =>
        `  • ${it.product_name}${it.variant_name ? ` (${it.variant_name})` : ""} x${it.quantity}  →  ${formatPrice(it.line_total)}`
    ),
    "",
    `Subtotal:         ${formatPrice(order.subtotal)}`,
    order.coupon_discount > 0 ? `Descuento cupón:  -${formatPrice(order.coupon_discount)}` : null,
    `TOTAL:            ${formatPrice(order.total)}`,
    "",
    order.notes ? `--- COMENTARIOS ---\n${order.notes}` : null,
    "",
    "==========================================",
  ].filter((l) => l !== null);

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedido-${order.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

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
    setStatusModal(o);
    setNewStatus(o.status);
  };

  const updateStatus = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_URL}/api/orders/${statusModal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Error updating order status:", err);
    } finally {
      setSaving(false);
      setStatusModal(null);
      fetchOrders();
    }
  };

  const clearFilters = () => {
    setFilterStatus("");
    setFilterClient("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setCurrentPage(1);
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

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterClient, filterDateFrom, filterDateTo]);

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
          <p>{filteredOrders.length} de {orders.length} pedidos</p>
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

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="">Todos los estados</option>
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>Desde</span>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>Hasta</span>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={inputStyle} />
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
        <>
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
                  paginatedOrders.map((o) => {
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
                          <span className="admin-status-pill" style={{ color, borderColor: color }}>
                            {STATUS_LABELS[o.status] || o.status}
                          </span>
                        </td>
                        <td className="admin-table-actions">
                          <button
                            className="admin-action-btn"
                            onClick={() => setViewModal(o)}
                            title="Ver pedido"
                            style={{ color: "var(--muted)" }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="admin-action-btn"
                            onClick={() => downloadOrderTxt(o)}
                            title="Descargar pedido"
                            style={{ color: "var(--muted)" }}
                          >
                            <Download size={15} />
                          </button>
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

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹ Anterior
              </button>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal: cambiar estado */}
      {statusModal && (
        <div className="admin-modal-overlay" onClick={() => setStatusModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Pedido #{statusModal.id}</h3>
              <button className="admin-modal-close" onClick={() => setStatusModal(null)}>
                <X size={20} />
              </button>
            </div>
            <p className="admin-table-muted" style={{ marginBottom: 15 }}>
              Cliente: <strong>{statusModal.profiles?.full_name || statusModal.profiles?.email || "—"}</strong>
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
                <button type="button" className="btn btn-ghost" onClick={() => setStatusModal(null)}>
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

      {/* Modal: ver detalle del pedido */}
      {viewModal && (
        <div className="admin-modal-overlay" onClick={() => setViewModal(null)}>
          <div
            className="admin-modal"
            style={{ maxWidth: 560, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h3>Pedido #{viewModal.id}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                  onClick={() => downloadOrderTxt(viewModal)}
                  title="Descargar"
                >
                  <Download size={14} /> Descargar
                </button>
                <button className="admin-modal-close" onClick={() => setViewModal(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Estado y entrega */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span
                className="admin-status-pill"
                style={{
                  color: STATUS_COLORS[viewModal.status],
                  borderColor: STATUS_COLORS[viewModal.status],
                }}
              >
                {STATUS_LABELS[viewModal.status] || viewModal.status}
              </span>
              <span
                className="admin-status-pill"
                style={{ color: "var(--muted)", borderColor: "var(--border)" }}
              >
                {DELIVERY_LABELS[viewModal.delivery_method] || "—"}
              </span>
            </div>

            {/* Datos del cliente */}
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                background: "var(--surface)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Cliente
              </div>
              <div style={{ display: "grid", gap: 4, fontSize: "0.88rem" }}>
                <div><strong>Nombre:</strong> {viewModal.profiles?.full_name || "—"}</div>
                <div><strong>Email:</strong> {viewModal.profiles?.email || "—"}</div>
                <div><strong>Teléfono:</strong> {viewModal.profiles?.phone || "—"}</div>
                <div><strong>Dirección:</strong> {viewModal.profiles?.address || "—"}</div>
              </div>
            </div>

            {/* Productos */}
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                background: "var(--surface)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Productos
              </div>
              {(viewModal.order_items ?? []).length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Sin productos</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {viewModal.order_items.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.87rem" }}>
                      <span>
                        {item.product_name}
                        {item.variant_name && (
                          <span style={{ color: "var(--muted)", marginLeft: 6 }}>({item.variant_name})</span>
                        )}
                        {" "}× {item.quantity}
                      </span>
                      <span style={{ fontWeight: 500 }}>{formatPrice(item.line_total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totales */}
            <div style={{ fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Subtotal</span>
                <span>{formatPrice(viewModal.subtotal)}</span>
              </div>
              {(viewModal.coupon_discount ?? 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Descuento cupón</span>
                  <span style={{ color: "#22c55e" }}>−{formatPrice(viewModal.coupon_discount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1rem", paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <span>Total</span>
                <span>{formatPrice(viewModal.total)}</span>
              </div>
            </div>

            {/* Comentarios */}
            {viewModal.notes && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(212,163,15,0.07)",
                  border: "1px solid rgba(212,163,15,0.2)",
                  borderRadius: "var(--radius)",
                  fontSize: "0.85rem",
                  color: "var(--text)",
                }}
              >
                <strong style={{ color: "var(--muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Comentarios
                </strong>
                <p style={{ margin: "6px 0 0" }}>{viewModal.notes}</p>
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setViewModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
