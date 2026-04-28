import { useState, useEffect, useRef } from "react";
import {
  Plus, Pencil, Trash2, X, Check, AlertCircle,
  Image as ImageIcon, Tag, Calendar, Search, Edit3,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const emptyCombo = {
  name: "", category: "Promociones", description: "", price: "", stock: 0,
  image_url: "", badge: "promo", unit: "pack", active: true,
};
const emptyDiscount = { productId: "", discountType: "pct", discountValue: "", startsAt: "", endsAt: "" };

const fmt = (p) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(p);

const calcSalePrice = (original, type, value) => {
  const v = parseFloat(value);
  if (!v || v <= 0) return null;
  return type === "pct"
    ? Math.round(original * (1 - v / 100))
    : Math.max(0, Math.round(original - v));
};

const promoStatus = (p) => {
  if (!p.sale_price) return null;
  const now = new Date();
  const start = p.promo_starts_at ? new Date(p.promo_starts_at) : null;
  const end = p.promo_ends_at ? new Date(p.promo_ends_at) : null;
  if (start && start > now) return "upcoming";
  if (end && end < now) return "expired";
  return "active";
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const toInputDate = (ts) => {
  if (!ts) return "";
  return new Date(ts).toISOString().slice(0, 10);
};

/* ─────────────────────────────────────────────────────────────── */

export default function AdminPromotions() {
  const [tab, setTab] = useState("descuentos");

  /* Combos */
  const [promos, setPromos] = useState([]);
  const [comboModal, setComboModal] = useState(null);
  const [comboForm, setComboForm] = useState(emptyCombo);
  const [deleteComboId, setDeleteComboId] = useState(null);
  const imageInputRef = useRef(null);

  /* Descuentos */
  const [allProducts, setAllProducts] = useState([]);
  const [discountedProducts, setDiscountedProducts] = useState([]);

  /* Formulario crear/editar descuento */
  const [discountForm, setDiscountForm] = useState(emptyDiscount);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [editingId, setEditingId] = useState(null); // id del producto que estamos editando
  const formRef = useRef(null);

  /* Buscador en el picker */
  const [productSearch, setProductSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const pickerRef = useRef(null);

  /* Selección masiva */
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({ discountType: "pct", discountValue: "", startsAt: "", endsAt: "" });
  const [savingBulk, setSavingBulk] = useState(false);
  const [removeSelectedConfirm, setRemoveSelectedConfirm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchAll(); }, []);

  /* Cerrar dropdown al hacer click fuera */
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: combos }, { data: products }] = await Promise.all([
      supabase.from("products").select("*").eq("category", "Promociones").order("created_at", { ascending: false }),
      supabase.from("products").select("*").neq("category", "Promociones").eq("active", true).order("name"),
    ]);
    setPromos(combos || []);
    const all = products || [];
    setAllProducts(all);
    setDiscountedProducts(all.filter((p) => p.sale_price != null));
    setLoading(false);
  };

  /* ── Combos ─────────────────────────────────────────────────── */
  const setCF = (f) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setComboForm((prev) => ({ ...prev, [f]: v }));
  };
  const openComboCreate = () => { setComboForm(emptyCombo); setError(""); setComboModal({ mode: "create" }); };
  const openComboEdit = (p) => { setComboForm(p); setError(""); setComboModal({ mode: "edit", id: p.id }); };
  const handleComboSave = async (e) => {
    e.preventDefault();
    if (!comboForm.name || !comboForm.price) return setError("Nombre y precio son obligatorios.");
    setSaving(true); setError("");
    const payload = { ...comboForm, price: parseFloat(comboForm.price), stock: parseInt(comboForm.stock) || 0, badge: comboForm.badge || null, category: "Promociones" };
    let err;
    if (comboModal.mode === "create") ({ error: err } = await supabase.from("products").insert(payload));
    else ({ error: err } = await supabase.from("products").update(payload).eq("id", comboModal.id));
    setSaving(false);
    if (err) { setError("Error al guardar."); return; }
    setComboModal(null); fetchAll();
  };
  const handleComboDelete = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    setDeleteComboId(null); fetchAll();
  };
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setSaving(true); setError("");
    const fileName = `${Math.random()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("productos").upload(fileName, file);
    if (uploadError) { setError("Error subiendo la imagen: " + uploadError.message); setSaving(false); return; }
    const { data } = supabase.storage.from("productos").getPublicUrl(fileName);
    setComboForm((f) => ({ ...f, image_url: data.publicUrl }));
    setSaving(false);
  };

  /* ── Descuentos — helpers ────────────────────────────────────── */
  const setDF = (field) => (e) => setDiscountForm((f) => ({ ...f, [field]: e.target.value }));

  const selectedProduct = allProducts.find((p) => p.id === parseInt(discountForm.productId));
  const previewSalePrice =
    selectedProduct && discountForm.discountValue
      ? calcSalePrice(selectedProduct.price, discountForm.discountType, discountForm.discountValue)
      : null;

  /* Lista filtrada para el picker */
  const pickerList = allProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectProduct = (p) => {
    setDiscountForm((f) => ({ ...f, productId: String(p.id) }));
    setProductSearch(p.name);
    setShowList(false);
  };

  const clearProduct = () => {
    setDiscountForm(emptyDiscount);
    setProductSearch("");
    setEditingId(null);
  };

  /* Cargar descuento existente para editar */
  const loadForEdit = (p) => {
    const pct = p.price > 0 ? Math.round((1 - p.sale_price / p.price) * 100) : 0;
    setDiscountForm({
      productId: String(p.id),
      discountType: "pct",
      discountValue: String(pct),
      startsAt: toInputDate(p.promo_starts_at),
      endsAt: toInputDate(p.promo_ends_at),
    });
    setProductSearch(p.name);
    setEditingId(p.id);
    setDiscountError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* Guardar descuento individual */
  const handleApplyDiscount = async (e) => {
    e.preventDefault();
    if (!discountForm.productId || !discountForm.discountValue)
      return setDiscountError("Seleccioná un producto y el valor del descuento.");
    if (previewSalePrice == null || previewSalePrice <= 0)
      return setDiscountError("El descuento resultante es inválido.");
    setSavingDiscount(true); setDiscountError("");
    const { error: err } = await supabase.from("products").update({
      sale_price: previewSalePrice,
      promo_starts_at: discountForm.startsAt ? `${discountForm.startsAt}T00:00:00` : null,
      promo_ends_at: discountForm.endsAt ? `${discountForm.endsAt}T23:59:59` : null,
    }).eq("id", parseInt(discountForm.productId));
    setSavingDiscount(false);
    if (err) {
      setDiscountError("Error al guardar. Verificá que existan las columnas sale_price, promo_starts_at y promo_ends_at en la tabla products.");
      return;
    }
    setDiscountForm(emptyDiscount);
    setProductSearch(""); setEditingId(null);
    fetchAll();
  };

  /* Quitar descuento individual */
  const handleRemoveDiscount = async (id) => {
    await supabase.from("products").update({ sale_price: null, promo_starts_at: null, promo_ends_at: null }).eq("id", id);
    fetchAll();
  };

  /* ── Selección masiva ────────────────────────────────────────── */
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === discountedProducts.length
      ? new Set()
      : new Set(discountedProducts.map((p) => p.id)));
  };

  const handleBulkEdit = async (e) => {
    e.preventDefault();
    if (!bulkForm.discountValue) return;
    setSavingBulk(true);
    for (const id of selectedIds) {
      const p = discountedProducts.find((x) => x.id === id);
      if (!p) continue;
      const sale = calcSalePrice(p.price, bulkForm.discountType, bulkForm.discountValue);
      if (!sale || sale <= 0) continue;
      await supabase.from("products").update({
        sale_price: sale,
        promo_starts_at: bulkForm.startsAt ? `${bulkForm.startsAt}T00:00:00` : null,
        promo_ends_at: bulkForm.endsAt ? `${bulkForm.endsAt}T23:59:59` : null,
      }).eq("id", id);
    }
    setSavingBulk(false);
    setBulkModal(false);
    setBulkForm({ discountType: "pct", discountValue: "", startsAt: "", endsAt: "" });
    setSelectedIds(new Set());
    fetchAll();
  };

  const handleBulkRemove = async () => {
    for (const id of selectedIds) {
      await supabase.from("products").update({ sale_price: null, promo_starts_at: null, promo_ends_at: null }).eq("id", id);
    }
    setRemoveSelectedConfirm(false);
    setSelectedIds(new Set());
    fetchAll();
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Promociones</h2>
          <p>{promos.length} combos · {discountedProducts.length} descuentos configurados</p>
        </div>
        {tab === "combos" && (
          <button className="btn btn-primary btn-sm" onClick={openComboCreate}>
            <Plus size={16} /> Nuevo combo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
        {[
          { key: "descuentos", label: "Descuentos en productos" },
          { key: "combos", label: "Combos y packs" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "8px 18px", border: "none", background: "none", cursor: "pointer",
            fontWeight: tab === key ? 700 : 400, color: tab === key ? "var(--red)" : "var(--muted)",
            borderBottom: tab === key ? "2px solid var(--red)" : "2px solid transparent",
            fontSize: "0.9rem", transition: "all 0.2s",
          }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-loading"><div className="auth-loading-spinner" /></div>
      ) : tab === "descuentos" ? (

        /* ══ TAB DESCUENTOS ══════════════════════════════════════ */
        <div>
          {/* ── Formulario ───────────────────────────────────── */}
          <div
            ref={formRef}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: 20, marginBottom: 28,
            }}
          >
            <h4 style={{ marginBottom: 16, fontFamily: "var(--font-head)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.85rem" }}>
              <Tag size={14} style={{ display: "inline", marginRight: 6, color: "var(--red)" }} />
              {editingId ? "Editar descuento" : "Aplicar descuento a un producto"}
            </h4>

            {discountError && (
              <div className="auth-error" style={{ marginBottom: 12 }}>
                <AlertCircle size={15} /><span>{discountError}</span>
              </div>
            )}

            <form onSubmit={handleApplyDiscount} className="admin-form" style={{ marginBottom: 0 }}>
              {/* Buscador de producto */}
              <div className="auth-field">
                <label>Producto *</label>
                <div ref={pickerRef} style={{ position: "relative" }}>
                  {selectedProduct ? (
                    /* Producto seleccionado */
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 8, padding: "9px 12px", border: "1px solid var(--border)",
                      borderRadius: "var(--radius)", background: "var(--bg)",
                    }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{selectedProduct.name}</span>
                        <span style={{ color: "var(--muted)", fontSize: "0.8rem", marginLeft: 8 }}>
                          {fmt(selectedProduct.price)} / {selectedProduct.unit}
                          {selectedProduct.sale_price && !editingId &&
                            <span style={{ color: "var(--gold)", marginLeft: 6 }}>⚠ ya tiene descuento</span>}
                        </span>
                      </div>
                      <button type="button" onClick={clearProduct}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 2 }}>
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    /* Buscador */
                    <>
                      <div style={{ position: "relative" }}>
                        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                        <input
                          value={productSearch}
                          onChange={(e) => { setProductSearch(e.target.value); setShowList(true); }}
                          onFocus={() => { if (productSearch) setShowList(true); }}
                          placeholder="Buscar por nombre o categoría..."
                          style={{ paddingLeft: 32, width: "100%", boxSizing: "border-box" }}
                          autoComplete="off"
                        />
                      </div>
                      {showList && productSearch.trim().length > 0 && pickerList.length > 0 && (
                        <div style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                          maxHeight: 220, overflowY: "auto", background: "var(--surface)",
                          border: "1px solid var(--border)", borderRadius: "var(--radius)",
                          zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        }}>
                          {pickerList.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectProduct(p)}
                              style={{
                                width: "100%", textAlign: "left", padding: "9px 14px",
                                background: "none", border: "none", cursor: "pointer",
                                borderBottom: "1px solid var(--border)", fontSize: "0.88rem",
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                color: "var(--text)",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                            >
                              <div>
                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                <span style={{ color: "var(--muted)", fontSize: "0.75rem", marginLeft: 8 }}>{p.category}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{fmt(p.price)} / {p.unit}</span>
                                {p.sale_price && <span style={{ fontSize: "0.7rem", background: "rgba(200,16,46,0.1)", color: "var(--red)", borderRadius: 4, padding: "1px 6px" }}>promo activa</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {showList && productSearch.trim().length > 0 && pickerList.length === 0 && (
                        <div style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                          padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)",
                          borderRadius: "var(--radius)", zIndex: 200, fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic",
                        }}>
                          Sin resultados para "{productSearch}"
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Tipo + valor */}
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Tipo *</label>
                  <select value={discountForm.discountType} onChange={setDF("discountType")}>
                    <option value="pct">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ($)</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>{discountForm.discountType === "pct" ? "Descuento (%)" : "Descuento ($)"} *</label>
                  <input
                    type="number"
                    value={discountForm.discountValue}
                    onChange={setDF("discountValue")}
                    placeholder={discountForm.discountType === "pct" ? "10" : "2000"}
                    min="0"
                    max={discountForm.discountType === "pct" ? 100 : undefined}
                    step={discountForm.discountType === "pct" ? "0.1" : "1"}
                    required
                  />
                </div>
              </div>

              {/* Preview */}
              {selectedProduct && previewSalePrice != null && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.15)",
                  borderRadius: "var(--radius)", marginBottom: 12, fontSize: "0.85rem",
                }}>
                  <span style={{ color: "var(--muted)", textDecoration: "line-through" }}>{fmt(selectedProduct.price)}</span>
                  <span style={{ color: "var(--red)", fontWeight: 700, fontSize: "1rem" }}>{fmt(previewSalePrice)}</span>
                  <span style={{ color: "var(--muted)" }}>/ {selectedProduct.unit}</span>
                  <span style={{
                    marginLeft: "auto", background: "var(--red)", color: "#fff",
                    borderRadius: "var(--radius-full)", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700,
                  }}>
                    {discountForm.discountType === "pct"
                      ? `-${discountForm.discountValue}%`
                      : `-${fmt(selectedProduct.price - previewSalePrice)}`}
                  </span>
                </div>
              )}

              {/* Fechas */}
              <div className="admin-form-row">
                <div className="auth-field">
                  <label><Calendar size={13} style={{ display: "inline", marginRight: 4 }} />Desde (opcional)</label>
                  <input type="date" value={discountForm.startsAt} onChange={setDF("startsAt")} />
                </div>
                <div className="auth-field">
                  <label><Calendar size={13} style={{ display: "inline", marginRight: 4 }} />Hasta (opcional)</label>
                  <input type="date" value={discountForm.endsAt} onChange={setDF("endsAt")} />
                </div>
              </div>

              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 12, fontStyle: "italic" }}>
                Sin fechas: aplica indefinidamente. Solo "hasta": empieza ahora y vence esa fecha.
              </p>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {editingId && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearProduct}>
                    Cancelar edición
                  </button>
                )}
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingDiscount}>
                  {savingDiscount
                    ? <span className="btn-spinner" />
                    : <><Check size={16} /> {editingId ? "Guardar cambios" : "Aplicar descuento"}</>}
                </button>
              </div>
            </form>
          </div>

          {/* ── Tabla de descuentos ───────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h4 style={{ fontFamily: "var(--font-head)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.85rem", margin: 0 }}>
              Descuentos configurados ({discountedProducts.length})
            </h4>
            {selectedIds.size > 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setBulkModal(true)}>
                  <Edit3 size={15} /> Editar seleccionados ({selectedIds.size})
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setRemoveSelectedConfirm(true)}>
                  <Trash2 size={15} /> Quitar descuentos
                </button>
              </div>
            )}
          </div>

          {discountedProducts.length === 0 ? (
            <p style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.9rem" }}>No hay descuentos configurados.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === discountedProducts.length && discountedProducts.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Producto</th>
                    <th>Precio original</th>
                    <th>Precio promo</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {discountedProducts.map((p) => {
                    const status = promoStatus(p);
                    const statusLabel = { active: "Activo", upcoming: "Programado", expired: "Vencido" }[status];
                    const statusClass = { active: "active", upcoming: "", expired: "inactive" }[status];
                    const statusStyle = status === "upcoming"
                      ? { background: "rgba(212,163,15,0.12)", color: "var(--gold)" } : undefined;
                    return (
                      <tr key={p.id} style={editingId === p.id ? { background: "rgba(200,16,46,0.04)" } : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                        </td>
                        <td>
                          <div className="admin-product-cell">
                            {p.image_url && <img src={p.image_url} alt={p.name} className="admin-product-thumb" />}
                            <div>
                              <span className="admin-product-name">{p.name}</span>
                              <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: 6 }}>{p.category}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: status === "active" ? "var(--muted)" : "var(--text)", textDecoration: status === "active" ? "line-through" : "none" }}>
                          {fmt(p.price)} / {p.unit}
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--red)" }}>
                          {fmt(p.sale_price)} / {p.unit}
                          <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: "0.75rem", marginLeft: 6 }}>
                            (-{Math.round((1 - p.sale_price / p.price) * 100)}%)
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          {fmtDate(p.promo_starts_at)} → {fmtDate(p.promo_ends_at)}
                        </td>
                        <td>
                          <span className={`admin-status-pill ${statusClass}`} style={statusStyle}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="admin-table-actions">
                          <button
                            className="admin-action-btn edit"
                            title="Editar descuento"
                            onClick={() => loadForEdit(p)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="admin-action-btn delete"
                            title="Quitar descuento"
                            onClick={() => handleRemoveDiscount(p.id)}
                          >
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : (

        /* ══ TAB COMBOS ════════════════════════════════════════ */
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Combo / Pack</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {promos.length === 0 ? (
                <tr><td colSpan={5} className="admin-table-empty">No hay combos</td></tr>
              ) : promos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-product-cell">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="admin-product-thumb" />}
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.description && (
                          <div style={{ fontSize: "0.78rem", color: "var(--muted)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.description}
                          </div>
                        )}
                        {p.badge && <span className="admin-table-muted" style={{ fontSize: 12 }}>Badge: {p.badge}</span>}
                      </div>
                    </div>
                  </td>
                  <td>{fmt(p.price)} / {p.unit}</td>
                  <td>{p.stock}</td>
                  <td>
                    <span className={`admin-status-pill ${p.active ? "active" : "inactive"}`}>
                      {p.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="admin-table-actions">
                    <button className="admin-action-btn edit" onClick={() => openComboEdit(p)}><Pencil size={15} /></button>
                    <button className="admin-action-btn delete" onClick={() => setDeleteComboId(p.id)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal edición masiva ──────────────────────────────── */}
      {bulkModal && (
        <div className="admin-modal-overlay" onClick={() => setBulkModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Editar descuento — {selectedIds.size} productos</h3>
              <button className="admin-modal-close" onClick={() => setBulkModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleBulkEdit} className="admin-form">
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 16 }}>
                El descuento se calculará sobre el <strong>precio original</strong> de cada producto seleccionado.
              </p>
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Tipo de descuento</label>
                  <select value={bulkForm.discountType} onChange={(e) => setBulkForm((f) => ({ ...f, discountType: e.target.value }))}>
                    <option value="pct">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ($)</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>{bulkForm.discountType === "pct" ? "Descuento (%)" : "Descuento ($)"} *</label>
                  <input
                    type="number" required
                    value={bulkForm.discountValue}
                    onChange={(e) => setBulkForm((f) => ({ ...f, discountValue: e.target.value }))}
                    placeholder={bulkForm.discountType === "pct" ? "10" : "2000"}
                    min="0" step={bulkForm.discountType === "pct" ? "0.1" : "1"}
                  />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="auth-field">
                  <label><Calendar size={13} style={{ display: "inline", marginRight: 4 }} />Desde (opcional)</label>
                  <input type="date" value={bulkForm.startsAt} onChange={(e) => setBulkForm((f) => ({ ...f, startsAt: e.target.value }))} />
                </div>
                <div className="auth-field">
                  <label><Calendar size={13} style={{ display: "inline", marginRight: 4 }} />Hasta (opcional)</label>
                  <input type="date" value={bulkForm.endsAt} onChange={(e) => setBulkForm((f) => ({ ...f, endsAt: e.target.value }))} />
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setBulkModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingBulk}>
                  {savingBulk ? <span className="btn-spinner" /> : <><Check size={16} /> Aplicar a {selectedIds.size} productos</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm quitar seleccionados ─────────────────────── */}
      {removeSelectedConfirm && (
        <div className="admin-modal-overlay" onClick={() => setRemoveSelectedConfirm(false)}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <Tag size={36} color="var(--red)" />
            <h3>¿Quitar {selectedIds.size} descuentos?</h3>
            <p>Los productos volverán a su precio original.</p>
            <div className="admin-modal-footer">
              <button className="btn btn-ghost" onClick={() => setRemoveSelectedConfirm(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleBulkRemove}>Quitar descuentos</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal combo crear/editar ──────────────────────────── */}
      {comboModal && (
        <div className="admin-modal-overlay" onClick={() => setComboModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{comboModal.mode === "create" ? "Nuevo combo" : "Editar combo"}</h3>
              <button className="admin-modal-close" onClick={() => setComboModal(null)}><X size={20} /></button>
            </div>
            {error && <div className="auth-error"><AlertCircle size={15} /><span>{error}</span></div>}
            <form onSubmit={handleComboSave} className="admin-form">
              <div className="auth-field">
                <label>Nombre *</label>
                <input value={comboForm.name} onChange={setCF("name")} placeholder="Ej: 2x1 en Chorizos" required />
              </div>
              <div className="auth-field">
                <label>Descripción</label>
                <textarea value={comboForm.description || ""} onChange={setCF("description")} rows={2} placeholder="Descripción del combo o pack..." />
              </div>
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Precio Final *</label>
                  <input type="number" value={comboForm.price} onChange={setCF("price")} placeholder="5000" min="0" step="0.01" required />
                </div>
                <div className="auth-field">
                  <label>Stock</label>
                  <input type="number" value={comboForm.stock} onChange={setCF("stock")} placeholder="0" min="0" />
                </div>
                <div className="auth-field">
                  <label>Unidad</label>
                  <input value={comboForm.unit} onChange={setCF("unit")} placeholder="pack, promo..." />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="auth-field">
                  <label>Badge</label>
                  <select value={comboForm.badge} onChange={setCF("badge")}>
                    <option value="">Ninguno</option>
                    <option value="promo">Oferta</option>
                    <option value="premium">Premium</option>
                    <option value="new">Nuevo</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>Imagen</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} style={{ display: "none" }} accept="image/*" />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => imageInputRef.current.click()} disabled={saving}>
                      <ImageIcon size={16} /> Subir imagen
                    </button>
                    {comboForm.image_url && <img src={comboForm.image_url} alt="Preview" style={{ height: 30, borderRadius: 4 }} />}
                  </div>
                </div>
              </div>
              <label className="admin-check-label">
                <input type="checkbox" checked={comboForm.active} onChange={setCF("active")} />
                Visible en tienda
              </label>
              <div className="admin-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setComboModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="btn-spinner" /> : <><Check size={16} /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm borrar combo ──────────────────────────────── */}
      {deleteComboId && (
        <div className="admin-modal-overlay" onClick={() => setDeleteComboId(null)}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={36} color="var(--red)" />
            <h3>¿Eliminar combo?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className="admin-modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteComboId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleComboDelete(deleteComboId)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
