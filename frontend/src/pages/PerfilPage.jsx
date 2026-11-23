import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';

export default function PerfilPage() {
  const { user, fetchProfile, rol } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', telefono: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  const actualizarPerfil = async () => {
    setRefreshError('');
    setRefreshing(true);
    try {
      await fetchProfile();
    } catch (err) {
      setRefreshError(getError(err));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setRefreshError('');
    setSaving(true);
    try {
      await api.patch('/perfil/', {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        telefono: form.telefono.trim(),
      });
      setMsg('Perfil actualizado correctamente.');
      await actualizarPerfil();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const inicial = (user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase();
  const rolClase = rol === 'admin' ? 'admin' : rol === 'soporte' ? 'soporte' : 'estudiante';

  return (
    <>
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1">
          <i className="bi bi-person-gear text-primary me-2" />
          Mi Perfil
        </h1>
        <p className="text-secondary small mb-0">
          Consultá el estado de tu cuenta institucional y actualizá tus datos de contacto.
        </p>
      </div>

      <div className="row g-4">
        {/* Info de cuenta */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4 d-flex flex-column">
              <div className="mb-3">
                <div className="profile-avatar">{inicial}</div>
              </div>
              <h5 className="fw-bold mb-1">{user?.first_name} {user?.last_name}</h5>
              <p className="text-secondary small mb-2 text-break">{user?.email}</p>
              <div className="mb-3">
                <span className={`role-badge role-badge--${rolClase} text-uppercase`}>
                  <i className="bi bi-person-badge" aria-hidden="true" />
                  {rol}
                </span>
              </div>
              <ul className="profile-meta mt-auto pt-2 border-top">
                <li>
                  <i className="bi bi-telephone" aria-hidden="true" />
                  <span>{user?.telefono || 'Sin teléfono registrado'}</span>
                </li>
                <li>
                  <i className={`bi ${user?.activo ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}`} aria-hidden="true" />
                  <span>Estado: <strong>{user?.activo ? 'Activo' : 'Inactivo'}</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Formulario de edición */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-pencil-square text-primary me-2" />
                Editar información personal
              </h5>
            </div>
            <div className="card-body p-4">
              {msg && (
                <div className="alert alert-success py-2 d-flex align-items-center gap-2" role="status">
                  <i className="bi bi-check-circle-fill flex-shrink-0" aria-hidden="true" />
                  <span>{msg}</span>
                </div>
              )}
              {error && (
                <div className="alert alert-danger py-2 d-flex align-items-center gap-2" role="alert">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
              {refreshError && (
                <div className="alert alert-warning py-2 d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert">
                  <span>No se pudieron volver a cargar los datos del perfil: {refreshError}</span>
                  <button
                    type="button"
                    className="btn btn-outline-warning btn-sm"
                    onClick={actualizarPerfil}
                    disabled={refreshing}
                  >
                    {refreshing ? 'Actualizando...' : 'Reintentar actualización'}
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-section-title">Identificación</div>
                <div className="row g-3 mb-3">
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
                </div>

                <div className="form-section-title">Contacto</div>
                <div className="row g-3">
                  <div className="col-12">
                    <label htmlFor="telefono" className="form-label">Teléfono</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-telephone" aria-hidden="true" />
                      </span>
                      <input id="telefono" name="telefono" className="form-control"
                        placeholder="8888-8888" value={form.telefono} onChange={change} />
                    </div>
                    <div className="form-text">Visible únicamente para coordinar tus viajes y reservas.</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top d-flex justify-content-end">
                  <button type="submit" className="btn btn-primary px-4" disabled={saving || refreshing}>
                    {saving ? (
                      <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
                    ) : (
                      <><i className="bi bi-check-lg me-1" />Guardar cambios</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
