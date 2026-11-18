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
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card border-0 shadow" style={{ maxWidth: 480, width: '100%' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-car-front-fill text-primary" style={{ fontSize: '2.5rem' }} />
            <h2 className="h4 fw-bold mt-2">Crear cuenta</h2>
            <p className="text-secondary small">Registro exclusivo para estudiantes UCR</p>
          </div>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="first_name" className="form-label">Nombre *</label>
                <input id="first_name" name="first_name" className="form-control"
                  value={form.first_name} onChange={change} required />
              </div>
              <div className="col-md-6">
                <label htmlFor="last_name" className="form-label">Apellidos</label>
                <input id="last_name" name="last_name" className="form-control"
                  value={form.last_name} onChange={change} />
              </div>
              <div className="col-12">
                <label htmlFor="email" className="form-label">Correo institucional *</label>
                <input id="email" name="email" type="email" className="form-control"
                  placeholder="usuario@ucr.ac.cr"
                  value={form.email} onChange={change} required />
              </div>
              <div className="col-md-6">
                <label htmlFor="password" className="form-label">Contraseña *</label>
                <input id="password" name="password" type="password" className="form-control"
                  value={form.password} onChange={change} required />
              </div>
              <div className="col-md-6">
                <label htmlFor="password2" className="form-label">Confirmar contraseña *</label>
                <input id="password2" name="password2" type="password" className="form-control"
                  value={form.password2} onChange={change} required />
              </div>
              <div className="col-12">
                <label htmlFor="telefono" className="form-label">Teléfono</label>
                <input id="telefono" name="telefono" className="form-control"
                  placeholder="8888-8888" value={form.telefono} onChange={change} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 mt-4" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Registrando...</>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          <p className="text-center mt-3 mb-0 small">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-primary fw-semibold">Iniciá sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
