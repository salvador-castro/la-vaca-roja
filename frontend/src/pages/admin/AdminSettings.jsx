import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Save, Check, Settings, AlertTriangle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const fmt = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
};

export default function AdminSettings() {
  const [freeShippingMin, setFreeShippingMin] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (data?.free_shipping_min !== undefined) setFreeShippingMin(String(data.free_shipping_min));
        if (data?.shipping_cost !== undefined) setShippingCost(String(data.shipping_cost));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const minVal = parseFloat(freeShippingMin);
    const costVal = parseFloat(shippingCost);
    if (isNaN(minVal) || minVal < 0) {
      setMsg({ type: "error", text: "Ingresá un monto válido para el envío gratis." });
      return;
    }
    if (isNaN(costVal) || costVal < 0) {
      setMsg({ type: "error", text: "Ingresá un monto válido para el costo de envío." });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      };

      const [r1, r2] = await Promise.all([
        fetch(`${API_URL}/api/settings`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ key: "free_shipping_min", value: String(minVal) }),
        }),
        fetch(`${API_URL}/api/settings`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ key: "shipping_cost", value: String(costVal) }),
        }),
      ]);

      if (!r1.ok || !r2.ok) {
        const d = await (!r1.ok ? r1 : r2).json();
        throw new Error(d.error ?? "Error al guardar");
      }
      setMsg({ type: "ok", text: "Configuración guardada correctamente." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
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
          {loadError && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: "var(--radius)",
                fontSize: "0.84rem",
                background: "rgba(200,16,46,0.08)",
                border: "1px solid rgba(200,16,46,0.25)",
                color: "var(--red)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertTriangle size={14} />
              No se pudieron cargar los valores actuales. Asegurate de haber ejecutado las migraciones en Supabase.
            </div>
          )}

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
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Envío</h3>
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
                    Los pedidos de {fmt(freeShippingMin)} o más recibirán envío gratis.
                  </span>
                )}
              </div>

              <div className="auth-field" style={{ marginTop: 16 }}>
                <label>Costo de envío (ARS)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="Ej: 1500"
                />
                {shippingCost && (
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                    Se cobrará {fmt(shippingCost)} cuando el pedido no alcance el mínimo para envío gratis.
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
