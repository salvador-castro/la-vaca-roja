import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Pencil, X, Check } from "lucide-react";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const STATUS_OPTS = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];
  const STATUS_LABELS = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    preparing: "Preparando",
    delivered: "Entregado",
    cancelled: "Cancelado"
  };

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data: oData, error: oError } = await supabase.from("orders").order("created_at", { ascending: false });
      if (oError) console.error("Error fetching orders:", oError);

      const { data: pData, error: pError } = await supabase.from("profiles").select("id, full_name, email");
      if (pError) console.error("Error fetching profiles:", pError);
      
      if (oData) {
        const pMap = {};
        if (pData) {
          pData.forEach(p => pMap[p.id] = p);
        }
        const ordersWithProfiles = oData.map(o => ({ ...o, profile: pMap[o?.user_id] }));
        setOrders(ordersWithProfiles);
      }
    } catch (err) {
      console.error("Exception in fetchOrders:", err);
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
    await supabase.from("orders").update({ status: newStatus }).eq("id", modal.id);
    setSaving(false);
    setModal(null);
    fetchOrders();
  };

  const formatPrice = (p) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(p);

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Pedidos</h2>
          <p>{orders.length} pedidos registrados</p>
        </div>
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
              {orders.length === 0 ? (
                <tr><td colSpan={6} className="admin-table-empty">No hay pedidos</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{o.profile?.full_name || o.profile?.email || (o.user_id ? "Usuario " + String(o.user_id).substring(0,6) : "Usuario anónimo")}</td>
                    <td>{new Date(o.created_at).toLocaleString("es-AR")}</td>
                    <td>{formatPrice(o.total)}</td>
                    <td>
                      <span className={`admin-status-pill ${o.status === 'delivered' ? 'active' : o.status === 'cancelled' ? 'inactive' : 'pending'}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button className="admin-action-btn edit" onClick={() => openStatusModal(o)} title="Cambiar Estado">
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))
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
              <button className="admin-modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            
            <p className="admin-table-muted" style={{ marginBottom: 15 }}>
              Cliente: <strong>{modal.profile?.full_name || modal.profile?.email}</strong>
            </p>

            <form onSubmit={updateStatus} className="admin-form">
              <div className="auth-field">
                <label>Estado del pedido</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
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
