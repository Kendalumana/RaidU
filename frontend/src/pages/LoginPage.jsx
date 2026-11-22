import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Complete todos los campos.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card border-0 shadow" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-car-front-fill text-primary" style={{ fontSize: '2.5rem' }} />
            <h2 className="h4 fw-bold mt-2">RaidU</h2>
            <p className="text-secondary small">Transporte compartido UCR</p>
          </div>

          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Correo institucional</label>
              <input
                id="email" type="email" className="form-control"
                placeholder="usuario@ucr.ac.cr"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoFocus required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="form-label">Contraseña</label>
              <input
                id="password" type="password" className="form-control"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="text-end mb-3">
              <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setMostrarRecuperacion(!mostrarRecuperacion)} aria-expanded={mostrarRecuperacion}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            {mostrarRecuperacion && <div className="alert alert-info small" role="status">La recuperación de contraseña estará disponible próximamente.</div>}
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Ingresando...</>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <p className="text-center mt-3 mb-0 small">
            ¿No tenés cuenta?{' '}
            <Link to="/registro" className="text-primary fw-semibold">Registrate aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
