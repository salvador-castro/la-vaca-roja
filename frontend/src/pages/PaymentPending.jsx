import { Link, useSearchParams } from "react-router-dom";

export default function PaymentPending() {
  const [params] = useSearchParams();
  const orderId = params.get("external_reference");

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 480,
          padding: "48px 32px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: 16 }}>⏳</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            marginBottom: 12,
          }}
        >
          Pago en proceso
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>
          Tu pago está siendo procesado. Te notificaremos cuando se confirme.
        </p>
        {orderId && (
          <p
            style={{
              fontSize: "0.82rem",
              color: "var(--muted)",
              marginBottom: 24,
            }}
          >
            N.° de pedido:{" "}
            <strong style={{ color: "var(--text)" }}>#{orderId}</strong>
          </p>
        )}
        <Link to="/dashboard" className="btn btn-primary">
          Ver mis pedidos
        </Link>
      </div>
    </main>
  );
}
