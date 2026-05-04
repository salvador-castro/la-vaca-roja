import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertCircle, Download, Upload, Edit3, Image as ImageIcon } from "lucide-react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

const API = `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/api/products`;

const CUTS = ["Fino", "Medio", "Grueso"];

const empty = {
  name: "",
  category: "",
  description: "",
  price: "",
  stock: 0,
  image_url: "",
  slug: "",
  unit: "kg",
  active: true,
  featured: false,
  variants: [],
};

const makeVariant = () => ({ _id: Date.now() + Math.random(), name: "", cut: "" });

const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

const apiCall = async (url, method, body) => {
  const token = await getToken();
  if (!token) throw new Error("Sin sesión activa. Volvé a iniciar sesión.");
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    priceAction: "none", priceValue: "", category: "", active: "", stockAction: "none", stockValue: "",
  });
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    supabase.from("categories").select("name").eq("active", true).order("name")
      .then(({ data }) => setCategories((data || []).map((c) => c.name)));
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .neq("category", "Promociones")
      .order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const openCreate = () => { setForm({ ...empty, category: categories[0] ?? "" }); setError(""); setModal({ mode: "create" }); };

  const openEdit = async (p) => {
    setError("");
    const { data: variantData } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", p.id)
      .order("id");

    const variants = (variantData || []).map((v) => {
      const parts = v.name.split(" - ");
      const lastPart = parts[parts.length - 1];
      const cut = parts.length > 1 && CUTS.includes(lastPart) ? lastPart : "";
      const name = cut ? parts.slice(0, -1).join(" - ") : v.name;
      return { _id: v.id, name, cut };
    });

    setForm({
      ...p,
      price: String(p.price),
      slug: p.badge || "",
      description: p.description || "",
      featured: p.featured ?? false,
      variants,
    });
    setModal({ mode: "edit", id: p.id });
  };

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const addVariant = () =>
    setForm((f) => ({ ...f, variants: [...f.variants, makeVariant()] }));

  const removeVariant = (i) =>
    setForm((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }));

  const updateVariant = (i, field, value) =>
    setForm((f) => {
      const next = [...f.variants];
      next[i] = { ...next[i], [field]: value };
      return { ...f, variants: next };
    });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return setError("Nombre y precio son obligatorios.");
    setSaving(true);
    setError("");

    const basePrice = parseFloat(form.price);

    const variants = form.variants
      .filter((v) => v.name.trim())
      .map((v) => ({
        name: v.cut ? `${v.name.trim()} - ${v.cut}` : v.name.trim(),
        active: true,
      }));

    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description || null,
      price: basePrice,
      stock: parseInt(form.stock) || 0,
      image_url: form.image_url || null,
      badge: form.slug || null,
      unit: form.unit,
      active: form.active,
      featured: form.featured,
      has_variants: variants.length > 0,
      variants,
    };

    try {
      if (modal.mode === "create") {
        await apiCall(API, "POST", payload);
      } else {
        await apiCall(`${API}/${modal.id}`, "PUT", payload);
      }
      setModal(null);
      fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiCall(`${API}/${id}`, "DELETE");
    } catch (err) {
      console.error("Error al eliminar:", err.message);
    }
    setDeleteId(null);
    fetchProducts();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSaving(true);
    setError("");

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("productos")
      .upload(fileName, file);

    if (uploadError) {
      setError("Error subiendo la imagen: " + uploadError.message);
      setSaving(false);
      return;
    }

    const { data } = supabase.storage.from("productos").getPublicUrl(fileName);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setSaving(false);
  };

  const exportToExcel = () => {
    const data = products.map((p) => ({
      ID: p.id, Nombre: p.name, Categoría: p.category,
      Precio: p.price, Stock: p.stock,
      Estado: p.active ? "Activo" : "Inactivo",
      Unidad: p.unit, Badge: p.badge || "",
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
      const wb = XLSX.read(evt.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      for (const row of rows) {
        if (!row.Nombre || !row.Precio) continue;
        const payload = {
          name: row.Nombre, category: row.Categoría || "Vacuno",
          price: parseFloat(row.Precio), stock: parseInt(row.Stock) || 0,
          active: row.Estado === "Activo", unit: row.Unidad || "kg",
          badge: row.Badge || null,
        };
        if (row.ID) await supabase.from("products").update(payload).eq("id", row.ID);
        else await supabase.from("products").insert(payload);
      }
      fetchProducts();
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const handleBulkEdit = async (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    setSaving(true);
    for (const id of selectedIds) {
      const product = products.find((p) => p.id === id);
      if (!product) continue;
      const updates = {};
      if (bulkForm.category) updates.category = bulkForm.category;
      if (bulkForm.active !== "") updates.active = bulkForm.active === "true";
      if (bulkForm.priceAction !== "none" && bulkForm.priceValue) {
        const val = parseFloat(bulkForm.priceValue);
        if (bulkForm.priceAction === "increase_pct") updates.price = product.price * (1 + val / 100);
        else if (bulkForm.priceAction === "decrease_pct") updates.price = product.price * (1 - val / 100);
        else if (bulkForm.priceAction === "increase_amt") updates.price = product.price + val;
        else if (bulkForm.priceAction === "decrease_amt") updates.price = Math.max(0, product.price - val);
      }
      if (bulkForm.stockAction !== "none" && bulkForm.stockValue !== "") {
        const val = parseInt(bulkForm.stockValue) || 0;
        if (bulkForm.stockAction === "set") updates.stock = Math.max(0, val);
        else if (bulkForm.stockAction === "add") updates.stock = product.stock + val;
        else if (bulkForm.stockAction === "sub") updates.stock = Math.max(0, product.stock - val);
      }
      if (Object.keys(updates).length > 0)
        await supabase.from("products").update(updates).eq("id", id);
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
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {selectedIds.size > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => setBulkModal(true)}>
              <Edit3 size={16} /> Edición Masiva ({selectedIds.size})
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} style={{ display: "none" }} accept=".xlsx,.xls" />
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
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={products.length > 0 && selectedIds.size === products.length} onChange={toggleSelectAll} />
                </th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio base</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={7} className="admin-table-empty">No hay productos</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                    <td>
                      <div className="admin-product-cell">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="admin-product-thumb" />}
                        <div>
                          <span className="admin-product-name">{p.name}</span>
                          {p.badge && (
                            <span className={`product-card-badge badge-${p.badge}`} style={{ position: "static", marginLeft: 6 }}>
                              {p.badge}
                            </span>
                          )}
                          {p.has_variants && (
                            <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: 6 }}>variantes</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td>{formatPrice(p.price)} / {p.unit}</td>
                    <td>{p.stock}</td>
                    <td>
                      <span className={`admin-status-pill ${p.active ? "active" : "inactive"}`}>
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button className="admin-action-btn edit" onClick={() => openEdit(p)} title="Editar"><Pencil size={15} /></button>
                      <button className="admin-action-btn delete" onClick={() => setDeleteId(p.id)} title="Eliminar"><Trash2 size={15} /></button>
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
          <div className="admin-modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
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
              {/* Nombre + Categoría */}
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Nombre *</label>
                  <input value={form.name} onChange={set("name")} placeholder="Ej: Bife de Chorizo" required />
                </div>
                <div className="auth-field">
                  <label>Categoría</label>
                  <select value={form.category} onChange={set("category")}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div className="auth-field">
                <label>Descripción</label>
                <textarea value={form.description} onChange={set("description")} rows={2} placeholder="Descripción del producto..." />
              </div>

              {/* Precio base + Stock + Unidad */}
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Precio *</label>
                  <input type="number" value={form.price} onChange={set("price")} placeholder="5000" min="0" step="0.01" required />
                </div>
                <div className="auth-field">
                  <label>Stock *</label>
                  <input type="number" value={form.stock} onChange={set("stock")} placeholder="0" min="0" step="1" required />
                </div>
                <div className="auth-field">
                  <label>Unidad *</label>
                  <input value={form.unit} onChange={set("unit")} placeholder="kg, bife, pollo, pack..." required />
                </div>
              </div>

              {/* Slug + Imagen */}
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Slug</label>
                  <input value={form.slug} onChange={set("slug")} placeholder="Ej: premium, oferta, sin-tac..." />
                </div>
                <div className="auth-field">
                  <label>Imagen</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} style={{ display: "none" }} accept="image/*" />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => imageInputRef.current.click()} disabled={saving}>
                      <ImageIcon size={16} /> Subir imagen
                    </button>
                    {form.image_url && <img src={form.image_url} alt="Preview" style={{ height: 30, borderRadius: 4 }} />}
                  </div>
                </div>
              </div>

              {/* Opciones de venta (variantes) */}
              <div className="auth-field">
                <label>
                  Opciones de venta
                  <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.78rem", marginLeft: 6 }}>
                    (cada opción tiene su propio precio)
                  </span>
                </label>

                {form.variants.length === 0 && (
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic", marginBottom: 8 }}>
                    Sin opciones: el cliente compra al precio base. Agregá opciones para permitir elegir
                    tipo de venta y grosor (ej: "Por bife" + Medio, "1 kg" + Sin corte).
                  </p>
                )}

                {form.variants.map((v, i) => (
                  <div key={v._id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <input
                      placeholder='Ej: "Por bife", "1 kg", "Entero"'
                      value={v.name}
                      onChange={(e) => updateVariant(i, "name", e.target.value)}
                      style={{ flex: 2 }}
                      required
                    />
                    <select
                      value={v.cut}
                      onChange={(e) => updateVariant(i, "cut", e.target.value)}
                      style={{ flex: 1 }}
                      title="Grosor del corte (opcional)"
                    >
                      <option value="">Sin corte</option>
                      <option value="Fino">Fino</option>
                      <option value="Medio">Medio</option>
                      <option value="Grueso">Grueso</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", padding: "4px", flexShrink: 0 }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 2 }} onClick={addVariant}>
                  <Plus size={14} /> Agregar opción
                </button>

              </div>

              {/* Activo */}
              <div className="admin-form-checks">
                <label className="admin-check-label">
                  <input type="checkbox" checked={form.active} onChange={set("active")} />
                  Producto activo
                </label>
                <label className="admin-check-label">
                  <input type="checkbox" checked={form.featured} onChange={set("featured")} />
                  Destacado en home
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
                <div style={{ display: "flex", gap: 10 }}>
                  <select value={bulkForm.priceAction} onChange={(e) => setBulkForm((f) => ({ ...f, priceAction: e.target.value }))}>
                    <option value="none">No modificar</option>
                    <option value="increase_pct">Aumentar (%)</option>
                    <option value="decrease_pct">Disminuir (%)</option>
                    <option value="increase_amt">Aumentar ($)</option>
                    <option value="decrease_amt">Disminuir ($)</option>
                  </select>
                  {bulkForm.priceAction !== "none" && (
                    <input type="number" placeholder="Valor" value={bulkForm.priceValue}
                      onChange={(e) => setBulkForm((f) => ({ ...f, priceValue: e.target.value }))} style={{ width: 100 }} />
                  )}
                </div>
              </div>
              <div className="auth-field">
                <label>Stock</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <select value={bulkForm.stockAction} onChange={(e) => setBulkForm((f) => ({ ...f, stockAction: e.target.value }))}>
                    <option value="none">No modificar</option>
                    <option value="set">Fijar valor a</option>
                    <option value="add">Sumar</option>
                    <option value="sub">Restar</option>
                  </select>
                  {bulkForm.stockAction !== "none" && (
                    <input type="number" placeholder="Cant" value={bulkForm.stockValue}
                      onChange={(e) => setBulkForm((f) => ({ ...f, stockValue: e.target.value }))} style={{ width: 100 }} />
                  )}
                </div>
              </div>
              <div className="auth-field">
                <label>Categoría</label>
                <select value={bulkForm.category} onChange={(e) => setBulkForm((f) => ({ ...f, category: e.target.value }))}>
                  <option value="">No modificar</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="auth-field">
                <label>Estado</label>
                <select value={bulkForm.active} onChange={(e) => setBulkForm((f) => ({ ...f, active: e.target.value }))}>
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
