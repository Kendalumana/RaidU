import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Complete todos los campos.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 430 }}>
        <div className="auth-card-header">
          <div className="auth-logo">
            <i className="bi bi-car-front-fill" aria-hidden="true" />
          </div>
          <h2 className="h4 fw-bold">RaidU</h2>
          <p>Transporte compartido universitario · UCR</p>
        </div>

        <div className="auth-card-body">
          {error && (
            <div className="alert alert-danger py-2 d-flex align-items-center gap-2 mb-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Usuario o correo electrónico</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-person" aria-hidden="true" />
                </span>
                <input
                  id="username" type="text" autoComplete="username" className="form-control"
                  placeholder="Ej. conductor o usuario@ucr.ac.cr"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  autoFocus required
                />
              </div>
            </div>
            <div className="mb-2">
              <label htmlFor="password" className="form-label">Contraseña</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock" aria-hidden="true" />
                </span>
                <input
                  id="password" type="password" className="form-control"
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="text-end mb-3">
              <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setMostrarRecuperacion(!mostrarRecuperacion)} aria-expanded={mostrarRecuperacion}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            {mostrarRecuperacion && (
              <div className="alert alert-info small py-2 d-flex align-items-center gap-2" role="status">
                <i className="bi bi-info-circle-fill flex-shrink-0" aria-hidden="true" />
                <span>La recuperación de contraseña estará disponible próximamente.</span>
              </div>
            )}
            <button type="submit" className="btn btn-primary w-100 py-2" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Ingresando...</>
              ) : (
                <><i className="bi bi-box-arrow-in-right me-2" aria-hidden="true" />Iniciar sesión</>
              )}
            </button>
          </form>

          <p className="auth-footer-link">
            ¿No tenés cuenta?{' '}
            <Link to="/registro" className="text-primary fw-semibold text-decoration-none">Registrate aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
