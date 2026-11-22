import { useState } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { hasAllowedRole } from './sessionPolicy.js';

export default function ProtectedRoute({ allowedRoles }) {
  const { status, token, user, isAuthenticated, fetchProfile, logout } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  if (status === 'checking') {
    return <div className="p-5 text-center" role="status">Validando sesión con raidU...</div>;
  }

  if (status === 'unavailable' && token) {
    const retry = async () => {
      setRetrying(true);
      setRetryError('');
      try {
        await fetchProfile();
      } catch {
        setRetryError('No se pudo validar la sesión. Compruebe la conexión e intente otra vez.');
      } finally {
        setRetrying(false);
      }
    };
    return (
      <div className="container py-5 text-center" role="alert">
        <h2 className="h5">No se pudo verificar la sesión</h2>
        <p>Compruebe que Django esté disponible antes de continuar.</p>
        {retryError && <p className="text-danger">{retryError}</p>}
        <button className="btn btn-primary me-2" onClick={retry} disabled={retrying}>
          {retrying ? 'Verificando...' : 'Reintentar'}
        </button>
        <button className="btn btn-outline-secondary" onClick={logout}>Cerrar sesión</button>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasAllowedRole(user, allowedRoles)) {
    return (
      <div className="container py-5 text-center" role="alert">
        <h2 className="h5 text-danger">Acceso restringido</h2>
        <p>Su perfil no tiene permisos para acceder a esta sección.</p>
        <Link className="btn btn-outline-primary" to="/">Volver al inicio</Link>
      </div>
    );
  }
  return <Outlet />;
}
