import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, KeyRound, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user arrives via the reset link
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Error al actualizar la contraseña.");
    } else {
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img
            src="https://gfjkhzudkctakwcyqmmj.supabase.co/storage/v1/object/public/logo/logoLaVacaRoja.png"
            alt="La Vaca Roja"
          />
        </div>

        {done ? (
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <CheckCircle size={44} color="#81c784" />
            <h2 className="auth-title">¡Contraseña actualizada!</h2>
            <p className="auth-subtitle">
              Serás redirigido al inicio de sesión en unos segundos.
            </p>
            <Link
              to="/login"
              className="btn btn-primary"
              style={{ marginTop: 8 }}
            >
              Ir al login
            </Link>
          </div>
        ) : !ready ? (
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <KeyRound size={36} style={{ color: "var(--muted)" }} />
            <h2 className="auth-title">Resetear contraseña</h2>
            <p className="auth-subtitle">
              Esperando el link de confirmación…
              <br />
              Si llegaste desde el email, la página se activará automáticamente.
            </p>
            <div className="auth-loading-spinner" style={{ marginTop: 8 }} />
          </div>
        ) : (
          <>
            <h2 className="auth-title">Nueva contraseña</h2>
            <p className="auth-subtitle">
              Elegí una contraseña segura para tu cuenta.
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <div className="auth-field">
                <label>Nueva contraseña</label>
                <div className="auth-input-wrap">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label>Confirmar contraseña</label>
                <div className="auth-input-wrap">
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repetí la contraseña"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-spinner" />
                ) : (
                  "Guardar nueva contraseña"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
