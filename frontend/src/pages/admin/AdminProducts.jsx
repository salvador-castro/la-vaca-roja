import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

const CATEGORIES = ["Vacuno", "Cerdo", "Pollo", "Hamburguesas", "Embutidos"];
const BADGES = [{ value: "", label: "Ninguno" }, { value: "premium", label: "Premium" }, { value: "promo", label: "Oferta" }, { value: "new", label: "Nuevo" }];

const empty = {
  name: "", category: "Vacuno", description: "", price: "",
  image_url: "", badge: "", unit: "kg", has_variants: false, active: true,
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit', data }
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const openCreate = () => { setForm(empty); setError(""); setModal({ mode: "create" }); };
  const openEdit = (p) => {
    setForm({ ...p, price: String(p.price), badge: p.badge || "" });
    setError("");
    setModal({ mode: "edit", id: p.id });
  };

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return setError("Nombre y precio son obligatorios.");
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      price: parseFloat(form.price),
      badge: form.badge || null,
    };

    let err;
    if (modal.mode === "create") {
      ({ error: err } = await supabase.from("products").insert(payload));
    } else {
      ({ error: err } = await supabase.from("products").update(payload).eq("id", modal.id));
    }

    setSaving(false);
    if (err) { setError("Error al guardar. Intentá de nuevo."); return; }
    setModal(null);
    fetchProducts();
  };

  const handleDelete = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    setDeleteId(null);
    fetchProducts();
  };

  const formatPrice = (p) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(p);

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Productos</h2>
          <p>{products.length} productos en catálogo</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="auth-loading-spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={5} className="admin-table-empty">No hay productos</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="admin-product-cell">
                        {p.image_url && (
                          <img src={p.image_url} alt={p.name} className="admin-product-thumb" />
                        )}
                        <div>
                          <span className="admin-product-name">{p.name}</span>
                          {p.badge && <span className={`product-card-badge badge-${p.badge}`} style={{position:'static',marginLeft:6}}>{p.badge}</span>}
                        </div>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td>{formatPrice(p.price)}</td>
                    <td>
                      <span className={`admin-status-pill ${p.active ? "active" : "inactive"}`}>
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button className="admin-action-btn edit" onClick={() => openEdit(p)} title="Editar">
                        <Pencil size={15} />
                      </button>
                      <button className="admin-action-btn delete" onClick={() => setDeleteId(p.id)} title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{modal.mode === "create" ? "Nuevo producto" : "Editar producto"}</h3>
              <button className="admin-modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>

            {error && (
              <div className="auth-error" style={{ margin: "0 0 12px" }}>
                <AlertCircle size={15} /><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="admin-form">
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Nombre *</label>
                  <input value={form.name} onChange={set("name")} placeholder="Ej: Bife de Chorizo" required />
                </div>
                <div className="auth-field">
                  <label>Categoría</label>
                  <select value={form.category} onChange={set("category")}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="auth-field">
                <label>Descripción</label>
                <textarea value={form.description} onChange={set("description")} rows={2} placeholder="Descripción del producto..." />
              </div>

              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Precio (ARS) *</label>
                  <input type="number" value={form.price} onChange={set("price")} placeholder="9200" min="0" required />
                </div>
                <div className="auth-field">
                  <label>Unidad</label>
                  <input value={form.unit} onChange={set("unit")} placeholder="kg" />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Badge</label>
                  <select value={form.badge} onChange={set("badge")}>
                    {BADGES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div className="auth-field">
                  <label>URL imagen</label>
                  <input value={form.image_url} onChange={set("image_url")} placeholder="/images/bife.png" />
                </div>
              </div>

              <div className="admin-form-checks">
                <label className="admin-check-label">
                  <input type="checkbox" checked={form.has_variants} onChange={set("has_variants")} />
                  Tiene variantes (fino/medio/grueso)
                </label>
                <label className="admin-check-label">
                  <input type="checkbox" checked={form.active} onChange={set("active")} />
                  Producto activo
                </label>
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

      {/* Confirm delete */}
      {deleteId && (
        <div className="admin-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={36} color="var(--red)" />
            <h3>¿Eliminar producto?</h3>
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
