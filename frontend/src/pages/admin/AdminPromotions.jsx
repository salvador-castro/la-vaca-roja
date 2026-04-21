import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertCircle, Image as ImageIcon } from "lucide-react";
import { supabase } from "../../lib/supabase";

const empty = { name: "", category: "Promociones", price: "", stock: 0, image_url: "", badge: "promo", unit: "pack", active: true };

export default function AdminPromotions() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const imageInputRef = useRef(null);

  useEffect(() => { fetchPromos(); }, []);

  const fetchPromos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("category", "Promociones")
      .order("created_at", { ascending: false });
    setPromos(data || []);
    setLoading(false);
  };

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const openCreate = () => { setForm(empty); setError(""); setModal({ mode: "create" }); };
  const openEdit = (p) => { setForm(p); setError(""); setModal({ mode: "edit", id: p.id }); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return setError("Nombre y precio son obligatorios.");
    setSaving(true);
    setError("");

    const payload = { 
      ...form, 
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
      badge: form.badge || null,
      category: "Promociones"
    };

    let err;
    if (modal.mode === "create") {
      ({ error: err } = await supabase.from("products").insert(payload));
    } else {
      ({ error: err } = await supabase.from("products").update(payload).eq("id", modal.id));
    }

    setSaving(false);
    if (err) { setError("Error al guardar."); return; }
    setModal(null);
    fetchPromos();
  };

  const handleDelete = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    setDeleteId(null);
    fetchPromos();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    setError("");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(filePath, file);

    if (uploadError) {
      setError("Error subiendo la imagen: " + uploadError.message);
      setSaving(false);
      return;
    }

    const { data } = supabase.storage.from('productos').getPublicUrl(filePath);
    setForm(f => ({ ...f, image_url: data.publicUrl }));
    setSaving(false);
  };

  const formatPrice = (p) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(p);

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Promociones y Combos</h2>
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
                <th>Promoción</th>
                <th>Precio</th>
                <th>Stock</th>
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
                      <div className="admin-product-cell">
                        {p.image_url && (
                          <img src={p.image_url} alt={p.name} className="admin-product-img" />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.badge && (
                            <span className="admin-table-muted" style={{ fontSize: 12 }}>Badge: {p.badge}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{formatPrice(p.price)} / {p.unit}</td>
                    <td>{p.stock}</td>
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
                <label>Nombre de la Promoción *</label>
                <input value={form.name} onChange={set("name")} placeholder="Ej: 2x1 en Chorizos" required />
              </div>

              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Precio Final *</label>
                  <input type="number" value={form.price} onChange={set("price")} placeholder="5000" min="0" step="0.01" required />
                </div>
                <div className="auth-field">
                  <label>Stock (Combos disp.)</label>
                  <input type="number" value={form.stock} onChange={set("stock")} placeholder="0" min="0" step="1" />
                </div>
                <div className="auth-field">
                  <label>Unidad</label>
                  <input value={form.unit} onChange={set("unit")} placeholder="pack, promo..." />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Etiqueta (Badge)</label>
                  <select value={form.badge} onChange={set("badge")}>
                    <option value="">Ninguna</option>
                    <option value="promo">Oferta</option>
                    <option value="premium">Premium</option>
                    <option value="new">Nuevo</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>Imagen</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => imageInputRef.current.click()} disabled={saving}>
                      <ImageIcon size={16} /> Subir Imagen
                    </button>
                    {form.image_url && <img src={form.image_url} alt="Preview" style={{ height: 30, borderRadius: 4 }} />}
                  </div>
                </div>
              </div>

              <label className="admin-check-label">
                <input type="checkbox" checked={form.active} onChange={set("active")} />
                Promoción activa (Visible en tienda)
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
