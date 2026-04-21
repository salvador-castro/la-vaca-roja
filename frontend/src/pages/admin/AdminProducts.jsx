import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertCircle, Download, Upload, Edit3, Image as ImageIcon } from "lucide-react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    priceAction: "none",
    priceValue: "",
    category: "",
    active: "",
  });
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

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

  const exportToExcel = () => {
    const data = products.map(p => ({
      ID: p.id,
      Nombre: p.name,
      Categoría: p.category,
      Precio: p.price,
      Estado: p.active ? "Activo" : "Inactivo",
      Unidad: p.unit,
      Badge: p.badge || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
    XLSX.writeFile(workbook, "productos_la_vaca_roja.xlsx");
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      for (let row of data) {
        if (!row.Nombre || !row.Precio) continue;
        
        const payload = {
          name: row.Nombre,
          category: row.Categoría || "Vacuno",
          price: parseFloat(row.Precio),
          active: row.Estado === "Activo",
          unit: row.Unidad || "kg",
          badge: row.Badge || null,
        };

        if (row.ID) {
          await supabase.from("products").update(payload).eq("id", row.ID);
        } else {
          await supabase.from("products").insert(payload);
        }
      }
      fetchProducts();
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map(p => p.id)));
  };

  const handleBulkEdit = async (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    setSaving(true);
    
    for (let id of selectedIds) {
      const product = products.find(p => p.id === id);
      if (!product) continue;

      let updates = {};
      
      if (bulkForm.category) updates.category = bulkForm.category;
      if (bulkForm.active !== "") updates.active = bulkForm.active === "true";
      
      if (bulkForm.priceAction !== "none" && bulkForm.priceValue) {
        const val = parseFloat(bulkForm.priceValue);
        if (bulkForm.priceAction === "increase_pct") updates.price = product.price * (1 + val/100);
        else if (bulkForm.priceAction === "decrease_pct") updates.price = product.price * (1 - val/100);
        else if (bulkForm.priceAction === "increase_amt") updates.price = product.price + val;
        else if (bulkForm.priceAction === "decrease_amt") updates.price = Math.max(0, product.price - val);
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("products").update(updates).eq("id", id);
      }
    }
    
    setSaving(false);
    setBulkModal(false);
    setSelectedIds(new Set());
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => setBulkModal(true)}>
              <Edit3 size={16} /> Edición Masiva ({selectedIds.size})
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} style={{ display: 'none' }} accept=".xlsx, .xls" />
          <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current.click()}>
            <Upload size={16} /> Importar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportToExcel}>
            <Download size={16} /> Exportar
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="auth-loading-spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" checked={products.length > 0 && selectedIds.size === products.length} onChange={toggleSelectAll} /></th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={6} className="admin-table-empty">No hay productos</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
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
      {/* Bulk edit modal */}
      {bulkModal && (
        <div className="admin-modal-overlay" onClick={() => setBulkModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Edición Masiva ({selectedIds.size} productos)</h3>
              <button className="admin-modal-close" onClick={() => setBulkModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleBulkEdit} className="admin-form">
              <div className="auth-field">
                <label>Precio</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select value={bulkForm.priceAction} onChange={(e) => setBulkForm(f => ({...f, priceAction: e.target.value}))}>
                    <option value="none">No modificar</option>
                    <option value="increase_pct">Aumentar (%)</option>
                    <option value="decrease_pct">Disminuir (%)</option>
                    <option value="increase_amt">Aumentar ($)</option>
                    <option value="decrease_amt">Disminuir ($)</option>
                  </select>
                  {bulkForm.priceAction !== "none" && (
                    <input type="number" placeholder="Valor" value={bulkForm.priceValue} onChange={(e) => setBulkForm(f => ({...f, priceValue: e.target.value}))} style={{ width: 100 }} />
                  )}
                </div>
              </div>

              <div className="auth-field">
                <label>Categoría</label>
                <select value={bulkForm.category} onChange={(e) => setBulkForm(f => ({...f, category: e.target.value}))}>
                  <option value="">No modificar</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="auth-field">
                <label>Estado</label>
                <select value={bulkForm.active} onChange={(e) => setBulkForm(f => ({...f, active: e.target.value}))}>
                  <option value="">No modificar</option>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setBulkModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="btn-spinner" /> : <><Check size={16} /> Aplicar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
