import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

const empty = {
  title: "", bank_name: "", bank_abbr: "", bank_color: "#c8102e",
  discount_percentage: "", deal_text: "", day_name: "", active: true,
};

export default function AdminPromotions() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { fetchPromos(); }, []);

  const fetchPromos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });
    setPromos(data || []);
    setLoading(false);
  };

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const openCreate = () => { setForm(empty); setError(""); setModal({ mode: "create" }); };
  const openEdit = (p) => { setForm({ ...p, discount_percentage: String(p.discount_percentage) }); setError(""); setModal({ mode: "edit", id: p.id }); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.discount_percentage) return setError("Título y descuento son obligatorios.");
    setSaving(true);
    setError("");

    const payload = { ...form, discount_percentage: parseInt(form.discount_percentage) };
    let err;
    if (modal.mode === "create") {
      ({ error: err } = await supabase.from("promotions").insert(payload));
    } else {
      ({ error: err } = await supabase.from("promotions").update(payload).eq("id", modal.id));
    }

    setSaving(false);
    if (err) { setError("Error al guardar."); return; }
    setModal(null);
    fetchPromos();
  };

  const handleDelete = async (id) => {
    await supabase.from("promotions").delete().eq("id", id);
    setDeleteId(null);
    fetchPromos();
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Promociones bancarias</h2>
          <p>{promos.length} promociones registradas</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={16} /> Nueva promo
        </button>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="auth-loading-spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Banco</th>
                <th>Descuento</th>
                <th>Día</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {promos.length === 0 ? (
                <tr><td colSpan={5} className="admin-table-empty">No hay promociones</td></tr>
              ) : (
                promos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          className="bank-abbr-badge"
                          style={{ background: p.bank_color + "22", color: p.bank_color, borderColor: p.bank_color + "44" }}
                        >
                          {p.bank_abbr}
                        </span>
                        {p.bank_name}
                      </div>
                    </td>
                    <td><strong style={{ color: "var(--red)" }}>{p.discount_percentage}% OFF</strong></td>
                    <td>{p.day_name || "—"}</td>
                    <td>
                      <span className={`admin-status-pill ${p.active ? "active" : "inactive"}`}>
                        {p.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button className="admin-action-btn edit" onClick={() => openEdit(p)}><Pencil size={15} /></button>
                      <button className="admin-action-btn delete" onClick={() => setDeleteId(p.id)}><Trash2 size={15} /></button>
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
              <h3>{modal.mode === "create" ? "Nueva promoción" : "Editar promoción"}</h3>
              <button className="admin-modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            {error && <div className="auth-error"><AlertCircle size={15} /><span>{error}</span></div>}
            <form onSubmit={handleSave} className="admin-form">
              <div className="auth-field">
                <label>Título *</label>
                <input value={form.title} onChange={set("title")} placeholder="40% OFF todos los martes" required />
              </div>
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Banco</label>
                  <input value={form.bank_name} onChange={set("bank_name")} placeholder="Banco Galicia" />
                </div>
                <div className="auth-field">
                  <label>Abreviatura</label>
                  <input value={form.bank_abbr} onChange={set("bank_abbr")} placeholder="GAL" maxLength={6} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Descuento % *</label>
                  <input type="number" value={form.discount_percentage} onChange={set("discount_percentage")} placeholder="40" min="1" max="100" required />
                </div>
                <div className="auth-field">
                  <label>Día</label>
                  <input value={form.day_name} onChange={set("day_name")} placeholder="Martes" />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Detalle del trato</label>
                  <input value={form.deal_text} onChange={set("deal_text")} placeholder="Visa y Mastercard" />
                </div>
                <div className="auth-field">
                  <label>Color del banco</label>
                  <input type="color" value={form.bank_color} onChange={set("bank_color")} style={{ height: 42, padding: 4 }} />
                </div>
              </div>
              <label className="admin-check-label">
                <input type="checkbox" checked={form.active} onChange={set("active")} />
                Promoción activa
              </label>
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

      {deleteId && (
        <div className="admin-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={36} color="var(--red)" />
            <h3>¿Eliminar promoción?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className="admin-modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
