import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres.");
    }
    if (form.password !== form.confirm) {
      return setError("Las contraseñas no coinciden.");
    }

    setLoading(true);
    const { error: err } = await signUp(form.email, form.password, form.fullName);
    setLoading(false);

    if (err) {
      setError(err.message === "User already registered"
        ? "Ya existe una cuenta con ese email."
        : "Error al registrarse. Intentá de nuevo."
      );
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  if (success) {
    return (
      <main className="auth-page">
        <div className="auth-card auth-success-card">
          <CheckCircle size={56} color="var(--red)" />
          <h2 className="auth-title">¡Cuenta creada!</h2>
          <p className="auth-subtitle">
            Revisá tu email para confirmar tu cuenta y luego podés ingresar.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>
            Ir al ingreso
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Link to="/" className="auth-logo">
            <span className="auth-logo-icon">🥩</span>
            <span>La Vaca <strong>Roja</strong></span>
          </Link>
        </div>

        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">Registrate y accedé a precios exclusivos y seguimiento de pedidos.</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="reg-name">Nombre completo</label>
            <input
              id="reg-name"
              type="text"
              value={form.fullName}
              onChange={set("fullName")}
              placeholder="Juan Pérez"
              required
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password">Contraseña</label>
            <div className="auth-input-wrap">
              <input
                id="reg-password"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPass((v) => !v)}
                aria-label="Ver contraseña"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-confirm">Confirmar contraseña</label>
            <input
              id="reg-confirm"
              type={showPass ? "text" : "password"}
              value={form.confirm}
              onChange={set("confirm")}
              placeholder="Repetí la contraseña"
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? (
              <span className="btn-spinner" />
            ) : (
              <>
                <UserPlus size={16} />
                Crear cuenta
              </>
            )}
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login">Ingresá acá</Link>
        </p>
      </div>
    </main>
  );
}
