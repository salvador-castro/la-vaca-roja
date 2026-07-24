import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Check } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const WHATSAPP_NUMBER = "5491166874595";

export default function TransferConfirmation() {
  const { orderId } = useParams();
  const [alias, setAlias] = useState("lavacaroja801");
  const [holderName, setHolderName] = useState("Micaela Cecilia Castelarini");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.transfer_alias) setAlias(data.transfer_alias);
        if (data?.transfer_holder_name) setHolderName(data.transfer_holder_name);
      })
      .catch(() => {});
  }, []);

  const copyAlias = () => {
    navigator.clipboard.writeText(alias).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const waMessage = encodeURIComponent(
    `Hola! Te envío el comprobante de transferencia del pedido #${orderId}`
  );
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`;

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 480,
          width: "100%",
          padding: "48px 32px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: 16 }}>🏦</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            marginBottom: 12,
          }}
        >
          ¡Pedido registrado!
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 4 }}>
          N.° de pedido: <strong style={{ color: "var(--text)" }}>#{orderId}</strong>
        </p>
        <p style={{ color: "var(--muted)", marginBottom: 24 }}>
          Transferí el monto total a la siguiente cuenta:
        </p>

        <div
          style={{
            textAlign: "left",
            padding: "16px 20px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Alias</div>
              <div style={{ fontSize: "1rem", fontWeight: 600 }}>{alias}</div>
            </div>
            <button
              onClick={copyAlias}
              className="btn btn-ghost"
              style={{ padding: "6px 10px", fontSize: "0.8rem" }}
              aria-label="Copiar alias"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Titular</div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>{holderName}</div>
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "rgba(200,16,46,0.07)",
            border: "1px solid rgba(200,16,46,0.2)",
            borderRadius: "var(--radius)",
            fontSize: "0.82rem",
            color: "var(--red)",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Tu pedido no comienza a prepararse hasta que nos envíes el comprobante y confirmemos la recepción del pago.
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Enviar comprobante por WhatsApp
          </a>
          <Link to="/dashboard" className="btn btn-secondary">
            Ver mis pedidos
          </Link>
        </div>
      </div>
    </main>
  );
}
