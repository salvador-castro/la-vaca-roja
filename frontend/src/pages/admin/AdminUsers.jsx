import { useState, useEffect } from "react";
import { Users, Shield, User, Search, Pencil, X, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const filtered = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (id, newRole) => {
    setSaving(true);
    await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    setSaving(false);
    setEditModal(null);
    fetchUsers();
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Usuarios</h2>
          <p>
            {users.filter((u) => u.role === "cliente").length} clientes ·{" "}
            {users.filter((u) => u.role === "admin").length} admins
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="admin-search-bar">
        <Search size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
        />
      </div>

      {loading ? (
        <div className="admin-loading"><div className="auth-loading-spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="admin-table-empty">No se encontraron usuarios</td></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="admin-user-avatar">
                          {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span>{u.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="admin-table-muted">{u.email}</td>
                    <td>
                      <span className={`admin-role-tag ${u.role}`}>
                        {u.role === "admin" ? <Shield size={12} /> : <User size={12} />}
                        {u.role}
                      </span>
                    </td>
                    <td className="admin-table-date">
                      {new Date(u.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="admin-table-actions">
                      <button
                        className="admin-action-btn edit"
                        onClick={() => setEditModal(u)}
                        title="Cambiar rol"
                      >
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

      {/* Edit role modal */}
      {editModal && (
        <div className="admin-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <Users size={36} color="var(--gold)" />
            <h3>Cambiar rol</h3>
            <p>
              <strong>{editModal.full_name || editModal.email}</strong>
            </p>
            <p className="admin-table-muted">
              Rol actual: <strong>{editModal.role}</strong>
            </p>
            <div className="admin-modal-footer" style={{ flexDirection: "column", gap: 8 }}>
              <button
                className="btn btn-primary"
                disabled={editModal.role === "admin" || saving}
                onClick={() => handleRoleChange(editModal.id, "admin")}
              >
                <Shield size={15} /> Hacer Admin
              </button>
              <button
                className="btn btn-ghost"
                disabled={editModal.role === "cliente" || saving}
                onClick={() => handleRoleChange(editModal.id, "cliente")}
              >
                <User size={15} /> Hacer Cliente
              </button>
              <button className="btn btn-ghost" onClick={() => setEditModal(null)}>
                <X size={15} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
