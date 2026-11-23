import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getError } from '../api/client.js';

export default function RegistroPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', password2: '',
    first_name: '', last_name: '', telefono: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password || !form.first_name.trim()) {
      setError('Complete los campos obligatorios.');
      return;
    }
    if (!form.email.trim().endsWith('@ucr.ac.cr')) {
      setError('Debe usar un correo institucional @ucr.ac.cr.');
      return;
    }
    if (form.password !== form.password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/usuarios/registro/', {
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        telefono: form.telefono.trim(),
      });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-card-header">
          <div className="auth-logo">
            <i className="bi bi-person-plus-fill" aria-hidden="true" />
          </div>
          <h2 className="h4 fw-bold">Crear cuenta</h2>
          <p>Registro exclusivo para estudiantes UCR (@ucr.ac.cr)</p>
        </div>

        <div className="auth-card-body">
          {error && (
            <div className="alert alert-danger py-2 d-flex align-items-center gap-2 mb-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-section-title">Datos personales</div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label htmlFor="first_name" className="form-label">Nombre <span className="text-danger">*</span></label>
                <input id="first_name" name="first_name" className="form-control"
                  placeholder="Ej. Ana"
                  value={form.first_name} onChange={change} required />
              </div>
              <div className="col-md-6">
                <label htmlFor="last_name" className="form-label">Apellidos</label>
                <input id="last_name" name="last_name" className="form-control"
                  placeholder="Ej. Mora Solís"
                  value={form.last_name} onChange={change} />
              </div>
              <div className="col-12">
                <label htmlFor="telefono" className="form-label">Teléfono <span className="text-muted fw-normal">(opcional)</span></label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-telephone" aria-hidden="true" />
                  </span>
                  <input id="telefono" name="telefono" className="form-control"
                    placeholder="8888-8888" value={form.telefono} onChange={change} />
                </div>
              </div>
            </div>

            <div className="form-section-title">Acceso institucional</div>
            <div className="row g-3">
              <div className="col-12">
                <label htmlFor="email" className="form-label">Correo institucional <span className="text-danger">*</span></label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-envelope" aria-hidden="true" />
                  </span>
                  <input id="email" name="email" type="email" className="form-control"
                    placeholder="usuario@ucr.ac.cr"
                    value={form.email} onChange={change} required />
                </div>
                <div className="form-text">Debe finalizar con @ucr.ac.cr.</div>
              </div>
              <div className="col-md-6">
                <label htmlFor="password" className="form-label">Contraseña <span className="text-danger">*</span></label>
                <input id="password" name="password" type="password" className="form-control"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password} onChange={change} required />
              </div>
              <div className="col-md-6">
                <label htmlFor="password2" className="form-label">Confirmar contraseña <span className="text-danger">*</span></label>
                <input id="password2" name="password2" type="password" className="form-control"
                  placeholder="Repita su contraseña"
                  value={form.password2} onChange={change} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 mt-4" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Registrando...</>
              ) : (
                <><i className="bi bi-check2-circle me-2" aria-hidden="true" />Crear cuenta</>
              )}
            </button>
          </form>

          <p className="auth-footer-link">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-primary fw-semibold text-decoration-none">Iniciá sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
