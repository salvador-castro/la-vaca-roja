import { Link, useSearchParams } from "react-router-dom";

export default function PaymentFailure() {
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
        <div style={{ fontSize: "4rem", marginBottom: 16 }}>❌</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            marginBottom: 12,
          }}
        >
          El pago no se completó
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>
          Hubo un problema con tu pago. Podés intentarlo de nuevo.
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
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link to="/cart" className="btn btn-primary">
            Volver al carrito
          </Link>
          <Link to="/shop" className="btn btn-secondary">
            Seguir comprando
          </Link>
        </div>
      </div>
    </main>
  );
}
