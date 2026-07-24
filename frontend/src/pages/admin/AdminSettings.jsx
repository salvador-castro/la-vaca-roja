import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Save, Check, Settings, AlertTriangle, Landmark } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const fmt = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
};

export default function AdminSettings() {
  const [freeShippingMin, setFreeShippingMin] = useState("");
  const [shippingZone1_3, setShippingZone1_3] = useState("");
  const [shippingZone3_5, setShippingZone3_5] = useState("");
  const [shippingZone5_10, setShippingZone5_10] = useState("");
  const [transferPercent, setTransferPercent] = useState("");
  const [transferAlias, setTransferAlias] = useState("");
  const [transferHolderName, setTransferHolderName] = useState("");
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
        setFreeShippingMin(data?.free_shipping_min !== undefined ? String(data.free_shipping_min) : "60000");
        setShippingZone1_3(data?.shipping_zone_1_3 !== undefined ? String(data.shipping_zone_1_3) : "3500");
        setShippingZone3_5(data?.shipping_zone_3_5 !== undefined ? String(data.shipping_zone_3_5) : "4500");
        setShippingZone5_10(data?.shipping_zone_5_10 !== undefined ? String(data.shipping_zone_5_10) : "6000");
        setTransferPercent(data?.transfer_discount_percent !== undefined ? String(data.transfer_discount_percent) : "10");
        setTransferAlias(data?.transfer_alias || "lavacaroja801");
        setTransferHolderName(data?.transfer_holder_name || "Micaela Cecilia Castelarini");
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    const numericFields = [
      ["Monto mínimo para envío gratis", freeShippingMin],
      ["costo de envío 1 a 3 km", shippingZone1_3],
      ["costo de envío 3 a 5 km", shippingZone3_5],
      ["costo de envío 5 a 10 km", shippingZone5_10],
      ["descuento por transferencia", transferPercent],
    ];
    for (const [label, value] of numericFields) {
      const n = parseFloat(value);
      if (isNaN(n) || n < 0) {
        setMsg({ type: "error", text: `Ingresá un monto válido para ${label}.` });
        return;
      }
    }
    if (!transferAlias.trim() || !transferHolderName.trim()) {
      setMsg({ type: "error", text: "Completá el alias y el titular de la cuenta." });
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

      const entries = [
        ["free_shipping_min", freeShippingMin],
        ["shipping_zone_1_3", shippingZone1_3],
        ["shipping_zone_3_5", shippingZone3_5],
        ["shipping_zone_5_10", shippingZone5_10],
        ["transfer_discount_percent", transferPercent],
        ["transfer_alias", transferAlias.trim()],
        ["transfer_holder_name", transferHolderName.trim()],
      ];

      const results = await Promise.all(
        entries.map(([key, value]) =>
          fetch(`${API_URL}/api/settings`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ key, value: String(value) }),
          })
        )
      );

      const failed = results.find((r) => !r.ok);
      if (failed) {
        const d = await failed.json();
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

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "24px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Settings size={18} style={{ color: "var(--red)" }} />
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Envío</h3>
              </div>

              <div className="auth-field">
                <label>Monto mínimo para envío gratis (ARS)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={freeShippingMin}
                  onChange={(e) => setFreeShippingMin(e.target.value)}
                  placeholder="Ej: 60000"
                />
                {freeShippingMin && (
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                    Los pedidos de {fmt(freeShippingMin)} o más (ya con descuentos aplicados) reciben envío gratis.
                  </span>
                )}
              </div>

              <div className="auth-field" style={{ marginTop: 16 }}>
                <label>Costo de envío 1 a 3 km (ARS)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={shippingZone1_3}
                  onChange={(e) => setShippingZone1_3(e.target.value)}
                  placeholder="Ej: 3500"
                />
              </div>

              <div className="auth-field" style={{ marginTop: 16 }}>
                <label>Costo de envío 3 a 5 km (ARS)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={shippingZone3_5}
                  onChange={(e) => setShippingZone3_5(e.target.value)}
                  placeholder="Ej: 4500"
                />
              </div>

              <div className="auth-field" style={{ marginTop: 16 }}>
                <label>Costo de envío 5 a 10 km (ARS)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={shippingZone5_10}
                  onChange={(e) => setShippingZone5_10(e.target.value)}
                  placeholder="Ej: 6000"
                />
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Landmark size={18} style={{ color: "var(--red)" }} />
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Pago por transferencia</h3>
              </div>

              <div className="auth-field">
                <label>Descuento por pagar con transferencia (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={transferPercent}
                  onChange={(e) => setTransferPercent(e.target.value)}
                  placeholder="Ej: 10"
                />
              </div>

              <div className="auth-field" style={{ marginTop: 16 }}>
                <label>Alias de la cuenta</label>
                <input
                  type="text"
                  value={transferAlias}
                  onChange={(e) => setTransferAlias(e.target.value)}
                  placeholder="Ej: lavacaroja801"
                />
              </div>

              <div className="auth-field" style={{ marginTop: 16 }}>
                <label>Titular de la cuenta</label>
                <input
                  type="text"
                  value={transferHolderName}
                  onChange={(e) => setTransferHolderName(e.target.value)}
                  placeholder="Ej: Nombre Apellido"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="btn-spinner" /> : <><Save size={15} /> Guardar</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
