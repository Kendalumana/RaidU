import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';

export default function PerfilPage() {
  const { user, fetchProfile, rol } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', telefono: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        telefono: user.telefono || '',
      });
    }
  }, [user]);

  const change = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setSaving(true);
    try {
      await api.patch('/perfil/', {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        telefono: form.telefono.trim(),
      });
      await fetchProfile();
      setMsg('Perfil actualizado correctamente.');
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="h3 fw-bold mb-4"><i className="bi bi-person-gear me-2" />Mi Perfil</h1>

      <div className="row g-4">
        {/* Info de cuenta */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center p-4">
              <i className="bi bi-person-circle text-primary" style={{ fontSize: '4rem' }} />
              <h5 className="fw-bold mt-3">{user?.first_name} {user?.last_name}</h5>
              <p className="text-secondary small mb-1">{user?.email}</p>
              <span className="badge bg-primary text-uppercase">{rol}</span>
              <hr />
              <p className="small text-secondary mb-1">
                <i className="bi bi-phone me-1" />{user?.telefono || 'Sin teléfono'}
              </p>
              <p className="small text-secondary mb-0">
                <i className="bi bi-check-circle me-1" />
                Estado: {user?.activo ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario de edición */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">Editar información</h5>

              {msg && <div className="alert alert-success py-2">{msg}</div>}
              {error && <div className="alert alert-danger py-2">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="first_name" className="form-label">Nombre</label>
                    <input id="first_name" name="first_name" className="form-control"
                      value={form.first_name} onChange={change} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="last_name" className="form-label">Apellidos</label>
                    <input id="last_name" name="last_name" className="form-control"
                      value={form.last_name} onChange={change} />
                  </div>
                  <div className="col-12">
                    <label htmlFor="telefono" className="form-label">Teléfono</label>
                    <input id="telefono" name="telefono" className="form-control"
                      placeholder="8888-8888" value={form.telefono} onChange={change} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-4" disabled={saving}>
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
                  ) : (
                    <><i className="bi bi-check-lg me-1" />Guardar cambios</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
