import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { canDeactivateOwnAccount } from '../auth/sessionPolicy.js';
import { api, getError } from '../api/client.js';

export default function AjustesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState('');

  const handleDeactivate = async () => {
    if (!canDeactivateOwnAccount(user) || deactivating) return;
    if (!window.confirm('¿Deseás desactivar tu cuenta? Perderás el acceso a raidU y se conservará tu historial.')) return;
    if (!window.confirm('Confirmación final: ¿estás seguro de desactivar tu cuenta? No podrás iniciar sesión hasta que administración la reactive.')) return;
    setError('');
    setDeactivating(true);
    try {
      await api.delete(`/usuarios/${user.id}/`);
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getError(err));
      setDeactivating(false);
    }
  };

  return (
    <>
      <h1 className="h3 fw-bold mb-4"><i className="bi bi-gear me-2" />Ajustes</h1>
      {canDeactivateOwnAccount(user) ? (
        <section className="card border-danger" aria-labelledby="desactivar-titulo">
          <div className="card-body">
            <h2 id="desactivar-titulo" className="h5 text-danger">Desactivar mi cuenta</h2>
            <p className="text-secondary small">Perderás acceso a raidU y se conservará tu historial. La reactivación requiere intervención de administración.</p>
            {error && <p className="text-danger" role="alert">{error}</p>}
            <button type="button" className="btn btn-outline-danger" disabled={deactivating} onClick={handleDeactivate}>
              {deactivating ? 'Desactivando...' : 'Desactivar mi cuenta'}
            </button>
          </div>
        </section>
      ) : <p className="text-secondary">No hay ajustes disponibles para tu cuenta por el momento.</p>}
    </>
  );
}
