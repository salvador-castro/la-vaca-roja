import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Save, Check, Settings } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function AdminSettings() {
  const [freeShippingMin, setFreeShippingMin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.free_shipping_min !== undefined) {
          setFreeShippingMin(String(data.free_shipping_min));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const val = parseFloat(freeShippingMin);
    if (isNaN(val) || val < 0) {
      setMsg({ type: "error", text: "Ingresá un monto válido." });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ key: "free_shipping_min", value: String(val) }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al guardar");
      }
      setMsg({ type: "ok", text: "Configuración guardada correctamente." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const formatPreview = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return "—";
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Configuración</h2>
          <p>Parámetros generales del negocio</p>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="auth-loading-spinner" /></div>
      ) : (
        <div style={{ maxWidth: 480 }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Settings size={18} style={{ color: "var(--red)" }} />
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Envío gratis</h3>
            </div>

            <form onSubmit={handleSave} className="admin-form">
              {msg && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "10px 14px",
                    borderRadius: "var(--radius)",
                    fontSize: "0.84rem",
                    background: msg.type === "ok" ? "rgba(34,197,94,0.08)" : "rgba(200,16,46,0.08)",
                    border: `1px solid ${msg.type === "ok" ? "rgba(34,197,94,0.25)" : "rgba(200,16,46,0.25)"}`,
                    color: msg.type === "ok" ? "#16a34a" : "var(--red)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {msg.type === "ok" && <Check size={14} />}
                  {msg.text}
                </div>
              )}

              <div className="auth-field">
                <label>Monto mínimo para envío gratis (ARS)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={freeShippingMin}
                  onChange={(e) => setFreeShippingMin(e.target.value)}
                  placeholder="Ej: 15000"
                />
                {freeShippingMin && (
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                    Los pedidos de {formatPreview(freeShippingMin)} o más recibirán envío gratis.
                  </span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="btn-spinner" /> : <><Save size={15} /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
