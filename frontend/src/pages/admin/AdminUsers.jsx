import { useState, useEffect } from "react";
import {
  Users,
  Shield,
  User,
  Search,
  Pencil,
  X,
  Check,
  Download,
  KeyRound,
  Mail,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_USERS = `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/api/users`;

const getToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    role: "cliente",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [resetMsg, setResetMsg] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

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
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const openEdit = (u) => {
    setEditModal(u);
    setEditForm({
      full_name: u.full_name || "",
      phone: u.phone || "",
      role: u.role || "cliente",
    });
  };

  const handleUserUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
        })
        .eq("id", editModal.id);

      if (editForm.role !== editModal.role) {
        const token = await getToken();
        const res = await fetch(API_USERS, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: editModal.id, role: editForm.role }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Error ${res.status}`);
        }
      }

      setEditModal(null);
      fetchUsers();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (email) => {
    setResetMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setResetMsg({ type: "error", text: `Error: ${error.message}` });
    } else {
      setResetMsg({ type: "ok", text: `Email de reseteo enviado a ${email}` });
    }
    setTimeout(() => setResetMsg(null), 5000);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Usuarios - La Vaca Roja", 14, 15);

    const tableData = filtered.map((u) => [
      u.full_name || "—",
      u.email,
      u.role,
      u.phone || "—",
      new Date(u.created_at).toLocaleDateString("es-AR"),
    ]);

    autoTable(doc, {
      head: [["Nombre", "Email", "Rol", "Teléfono", "Registro"]],
      body: tableData,
      startY: 20,
    });

    doc.save("usuarios_la_vaca_roja.pdf");
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
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-primary btn-sm" onClick={exportToPDF}>
            <Download size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      {resetMsg && (
        <div
          className={`client-profile-msg ${resetMsg.type}`}
          style={{ maxWidth: 480 }}
        >
          <Mail size={15} />
          {resetMsg.text}
        </div>
      )}

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
        <div className="admin-loading">
          <div className="auth-loading-spinner" />
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div className="admin-user-avatar">
                          {u.full_name?.[0]?.toUpperCase() ||
                            u.email?.[0]?.toUpperCase() ||
                            "?"}
                        </div>
                        <span>{u.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="admin-table-muted">{u.email}</td>
                    <td className="admin-table-muted">
                      {u.phone || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td>
                      <span className={`admin-role-tag ${u.role}`}>
                        {u.role === "admin" ? (
                          <Shield size={12} />
                        ) : (
                          <User size={12} />
                        )}
                        {u.role}
                      </span>
                    </td>
                    <td className="admin-table-date">
                      {new Date(u.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="admin-table-actions">
                      <button
                        className="admin-action-btn edit"
                        onClick={() => openEdit(u)}
                        title="Editar usuario"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="admin-action-btn"
                        onClick={() => handleResetPassword(u.email)}
                        title="Enviar reset de contraseña"
                        style={{ color: "var(--muted)" }}
                      >
                        <KeyRound size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit user modal */}
      {editModal && (
        <div className="admin-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Editar Usuario</h3>
              <button
                className="admin-modal-close"
                onClick={() => setEditModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <p
              className="admin-table-muted"
              style={{ padding: "0 24px 4px", marginTop: 16 }}
            >
              Editando a: <strong>{editModal.email}</strong>
            </p>

            <form onSubmit={handleUserUpdate} className="admin-form">
              <div className="auth-field">
                <label>Nombre Completo</label>
                <input
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="auth-field">
                <label>Teléfono</label>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="Ej: +54 11 1234-5678"
                />
              </div>

              <div className="auth-field">
                <label>Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  <option value="cliente">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {saveError && (
                <p
                  style={{
                    color: "var(--error, #e53e3e)",
                    fontSize: 13,
                    padding: "0 4px",
                  }}
                >
                  {saveError}
                </p>
              )}
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditModal(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <span className="btn-spinner" />
                  ) : (
                    <>
                      <Check size={16} /> Guardar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
