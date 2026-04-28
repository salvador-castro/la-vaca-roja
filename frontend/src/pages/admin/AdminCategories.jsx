import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertCircle, FolderOpen } from "lucide-react";
import { supabase } from "../../lib/supabase";

const empty = { name: "", active: true };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tableError, setTableError] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    setTableError(null);

    const [{ data: cats, error: catErr }, { data: products }] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("products").select("id, category").neq("is_combo", true),
    ]);

    if (catErr) {
      setTableError(catErr.message || catErr.code || "Error desconocido");
      setLoading(false);
      return;
    }

    const counts = {};
    (products || []).forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    setCategories(cats || []);
    setProductCounts(counts);
    setLoading(false);
  };

  const openCreate = () => { setForm(empty); setError(""); setModal({ mode: "create" }); };
  const openEdit = (cat) => { setForm({ name: cat.name, active: cat.active }); setError(""); setModal({ mode: "edit", id: cat.id }); };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError("El nombre es obligatorio.");
    setSaving(true); setError("");

    let err;
    if (modal.mode === "create") {
      ({ error: err } = await supabase.from("categories").insert({ name, active: form.active }));
    } else {
      ({ error: err } = await supabase.from("categories").update({ name, active: form.active }).eq("id", modal.id));
      if (!err && form.name !== modal.originalName) {
        await supabase.from("products").update({ category: name }).eq("category", modal.originalName);
      }
    }

    setSaving(false);
    if (err) {
      setError(err.code === "23505" ? "Ya existe una categoría con ese nombre." : "Error al guardar.");
      return;
    }
    setModal(null);
    fetchAll();
  };

  const openDelete = (cat) => {
    const count = productCounts[cat.name] || 0;
    setDeleteTarget({ ...cat, count });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("categories").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    fetchAll();
  };

  const openEditWithName = (cat) => {
    setForm({ name: cat.name, active: cat.active });
    setError("");
    setModal({ mode: "edit", id: cat.id, originalName: cat.name });
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Categorías</h2>
          <p>{categories.length} categorías configuradas</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={16} /> Nueva categoría
        </button>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="auth-loading-spinner" /></div>
      ) : tableError ? (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: 24, textAlign: "center",
        }}>
          <AlertCircle size={32} color="var(--red)" style={{ marginBottom: 12 }} />
          <h4 style={{ marginBottom: 8 }}>Error al cargar categorías</h4>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 4 }}>
            {tableError}
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 16, fontStyle: "italic" }}>
            Si la tabla existe pero no carga, probablemente faltan políticas RLS. Ejecutá este SQL en Supabase:
          </p>
          <pre style={{
            background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
            padding: 16, textAlign: "left", fontSize: "0.8rem", color: "var(--text)", overflowX: "auto",
          }}>{`-- Crear tabla (omitir si ya existe)
create table if not exists categories (
  id serial primary key,
  name text not null unique,
  active boolean default true,
  created_at timestamptz default now()
);

-- Seed inicial (omitir si ya tiene datos)
insert into categories (name) values
  ('Vacuno'), ('Cerdo'), ('Pollo'),
  ('Hamburguesas'), ('Embutidos')
on conflict (name) do nothing;

-- Políticas RLS
alter table categories enable row level security;

create policy "categories_read_all"
  on categories for select using (true);

create policy "categories_write_auth"
  on categories for all
  to authenticated
  using (true) with check (true);`}</pre>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 16 }}
            onClick={fetchAll}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Productos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={4} className="admin-table-empty">No hay categorías</td></tr>
              ) : categories.map((cat) => {
                const count = productCounts[cat.name] || 0;
                return (
                  <tr key={cat.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <FolderOpen size={16} color="var(--red)" />
                        <span style={{ fontWeight: 600 }}>{cat.name}</span>
                      </div>
                    </td>
                    <td style={{ color: count > 0 ? "var(--text)" : "var(--muted)" }}>
                      {count} {count === 1 ? "producto" : "productos"}
                    </td>
                    <td>
                      <span className={`admin-status-pill ${cat.active ? "active" : "inactive"}`}>
                        {cat.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button
                        className="admin-action-btn edit"
                        title="Editar"
                        onClick={() => openEditWithName(cat)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="admin-action-btn delete"
                        title="Eliminar"
                        onClick={() => openDelete(cat)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{modal.mode === "create" ? "Nueva categoría" : "Editar categoría"}</h3>
              <button className="admin-modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>

            {error && (
              <div className="auth-error" style={{ margin: "0 0 12px" }}>
                <AlertCircle size={15} /><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="admin-form">
              <div className="auth-field">
                <label>Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Vacuno, Cerdo, Pollo..."
                  required
                  autoFocus
                />
              </div>
              {modal.mode === "edit" && modal.originalName !== form.name && (
                <p style={{ fontSize: "0.78rem", color: "var(--gold)", marginBottom: 12 }}>
                  ⚠ Renombrar actualizará todos los productos de esta categoría.
                </p>
              )}
              <label className="admin-check-label">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Categoría activa
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

      {/* Confirm eliminar */}
      {deleteTarget && (
        <div className="admin-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={36} color="var(--red)" />
            <h3>¿Eliminar categoría "{deleteTarget.name}"?</h3>
            {deleteTarget.count > 0 ? (
              <>
                <p style={{ color: "var(--gold)" }}>
                  {deleteTarget.count} {deleteTarget.count === 1 ? "producto usa" : "productos usan"} esta categoría.
                  Reasignarlos antes de eliminarla.
                </p>
                <div className="admin-modal-footer">
                  <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Entendido</button>
                </div>
              </>
            ) : (
              <>
                <p>Esta acción no se puede deshacer.</p>
                <div className="admin-modal-footer">
                  <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
