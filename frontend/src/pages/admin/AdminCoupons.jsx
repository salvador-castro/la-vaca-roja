import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertCircle, Copy } from "lucide-react";
import { supabase } from "../../lib/supabase";

const formatPrice = (p) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(p ?? 0);

const empty = {
  code: "", discount_type: "percentage", discount_value: "",
  min_order_amount: "", max_uses: "", expires_at: "", active: true,
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const openCreate = () => { setForm(empty); setError(""); setModal({ mode: "create" }); };
  const openEdit = (c) => {
    setForm({
      ...c,
      discount_value: String(c.discount_value),
      min_order_amount: String(c.min_order_amount ?? ""),
      max_uses: String(c.max_uses ?? ""),
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
    });
    setError("");
    setModal({ mode: "edit", id: c.id });
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm((f) => ({ ...f, code }));
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code || !form.discount_value) return setError("Código y descuento son obligatorios.");
    setSaving(true);
    setError("");

    const payload = {
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      active: form.active,
    };

    let err;
    if (modal.mode === "create") {
      ({ error: err } = await supabase.from("coupons").insert(payload));
    } else {
      ({ error: err } = await supabase.from("coupons").update(payload).eq("id", modal.id));
    }

    setSaving(false);
    if (err) {
      setError(err.message.includes("unique") ? "Ese código ya existe." : err.message);
      return;
    }
    setModal(null);
    fetchCoupons();
  };

  const handleDelete = async (id) => {
    await supabase.from("coupons").delete().eq("id", id);
    setDeleteId(null);
    fetchCoupons();
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Cupones de descuento</h2>
          <p>{coupons.filter((c) => c.active).length} activos · {coupons.length} total</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={16} /> Nuevo cupón
        </button>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="auth-loading-spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descuento</th>
                <th>Min. compra</th>
                <th>Usos</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan={7} className="admin-table-empty">No hay cupones</td></tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="coupon-code">{c.code}</span>
                        <button
                          className="admin-action-btn"
                          onClick={() => copyCode(c.code)}
                          title="Copiar código"
                          style={{ padding: "2px 4px" }}
                        >
                          {copied === c.code ? <Check size={13} color="var(--red)" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: "var(--red)" }}>
                        {c.discount_type === "percentage"
                          ? `${c.discount_value}%`
                          : formatPrice(c.discount_value)}
                      </strong>
                    </td>
                    <td>{c.min_order_amount ? formatPrice(c.min_order_amount) : "—"}</td>
                    <td>
                      {c.max_uses
                        ? `${c.uses_count} / ${c.max_uses}`
                        : `${c.uses_count} / ∞`}
                    </td>
                    <td className="admin-table-date">
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString("es-AR")
                        : "Sin vencimiento"}
                    </td>
                    <td>
                      <span className={`admin-status-pill ${c.active ? "active" : "inactive"}`}>
                        {c.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button className="admin-action-btn edit" onClick={() => openEdit(c)}><Pencil size={15} /></button>
                      <button className="admin-action-btn delete" onClick={() => setDeleteId(c.id)}><Trash2 size={15} /></button>
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
              <h3>{modal.mode === "create" ? "Nuevo cupón" : "Editar cupón"}</h3>
              <button className="admin-modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            {error && <div className="auth-error"><AlertCircle size={15} /><span>{error}</span></div>}
            <form onSubmit={handleSave} className="admin-form">
              <div className="auth-field">
                <label>Código * <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8em" }}>(podés escribir el tuyo o generarlo)</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={form.code}
                    onChange={set("code")}
                    placeholder="Ej: LAVACAROJA"
                    required
                    style={{ textTransform: "uppercase", flex: 1 }}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={generateCode} style={{ whiteSpace: "nowrap" }}>
                    Generar
                  </button>
                </div>
              </div>

              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Tipo de descuento</label>
                  <select value={form.discount_type} onChange={set("discount_type")}>
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ($)</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>Valor *</label>
                  <input type="number" value={form.discount_value} onChange={set("discount_value")} placeholder={form.discount_type === "percentage" ? "20" : "1000"} min="0" required />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Compra mínima (ARS) <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8em" }}>(vacío = sin mínimo)</span></label>
                  <input type="number" value={form.min_order_amount} onChange={set("min_order_amount")} placeholder="Sin mínimo" min="0" />
                </div>
                <div className="auth-field">
                  <label>Usos máximos <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8em" }}>(vacío = ilimitado)</span></label>
                  <input type="number" value={form.max_uses} onChange={set("max_uses")} placeholder="Ilimitado" min="1" />
                </div>
              </div>

              <div className="auth-field">
                <label>Fecha de vencimiento</label>
                <input type="date" value={form.expires_at} onChange={set("expires_at")} />
              </div>

              <label className="admin-check-label">
                <input type="checkbox" checked={form.active} onChange={set("active")} />
                Cupón activo
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
            <h3>¿Eliminar cupón?</h3>
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
