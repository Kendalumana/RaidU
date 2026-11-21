import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AppLayout() {
  const { user, rol, esAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const exit = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const rolBadge = {
    admin: 'bg-danger text-white',
    soporte: 'bg-warning text-dark',
    estudiante: 'bg-primary text-white',
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar (escritorio) ── */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <i className="bi bi-car-front-fill text-primary me-2 fs-4" />
          <span>RaidU</span>
        </div>

        <p className="sidebar-label">MENÚ PRINCIPAL</p>
        <nav className="nav flex-column gap-1" aria-label="Menú principal">
          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-speedometer2 me-2" />Dashboard
          </NavLink>
          <NavLink to="/vehiculos" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-truck me-2" />Vehículos
          </NavLink>
          <NavLink to="/viajes" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-map me-2" />Viajes
          </NavLink>
          <NavLink to="/reservas" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-bookmark-check me-2" />Reservas
          </NavLink>
          <NavLink to="/calificaciones" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-star me-2" />Calificaciones
          </NavLink>
          <NavLink to="/perfil" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-person-gear me-2" />Mi Perfil
          </NavLink>
        </nav>

        {/* ── Sección exclusiva para rol Staff / Administrador (RF2 requerimiento) ── */}
        {(esAdmin || rol === 'admin' || rol === 'soporte') && (
          <div className="mt-3 pt-3 border-top border-secondary border-opacity-25">
            <p className="sidebar-label text-warning mb-2">
              <i className="bi bi-shield-lock-fill me-1" />ADMINISTRACIÓN
            </p>
            <nav className="nav flex-column gap-1" aria-label="Menú administración">
              <NavLink to="/usuarios" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <i className="bi bi-people-fill text-warning me-2" />Usuarios & Moderación
              </NavLink>
            </nav>
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="fw-semibold text-light mb-1">Universidad de Costa Rica</div>
          <div>Sede del Pacífico</div>
        </div>
      </aside>

      {/* ── Área principal ── */}
      <div className="app-main">
        <header className="app-topbar">
          <span className="d-md-none fw-bold text-primary fs-5">
            <i className="bi bi-car-front-fill me-2" />RaidU
          </span>

          <div className="ms-auto d-flex align-items-center gap-3">
            {esAdmin ? (
              <span className="badge bg-danger text-uppercase px-2 py-1 shadow-sm">
                <i className="bi bi-shield-check me-1" />Staff Admin
              </span>
            ) : (
              <span className={`badge ${rolBadge[rol] || 'bg-secondary'} text-uppercase px-2 py-1`}>
                {rol}
              </span>
            )}

            <span className="small text-secondary fw-semibold">
              <i className="bi bi-person-circle me-1 fs-6 text-primary" />
              {user?.first_name || user?.username || 'Usuario'}
            </span>

            <button className="btn btn-outline-danger btn-sm" onClick={exit} title="Cerrar sesión">
              <i className="bi bi-box-arrow-right me-1" />Salir
            </button>
          </div>
        </header>

        {/* ── Enlaces móviles con sección Staff diferenciada ── */}
        <div className="mobile-links d-md-none p-3 d-flex gap-2 flex-wrap">
          <NavLink to="/" end className="btn btn-outline-primary btn-sm">
            <i className="bi bi-speedometer2 me-1" />Dashboard
          </NavLink>
          <NavLink to="/vehiculos" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-truck me-1" />Vehículos
          </NavLink>
          <NavLink to="/viajes" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-map me-1" />Viajes
          </NavLink>
          <NavLink to="/reservas" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-bookmark-check me-1" />Reservas
          </NavLink>
          <NavLink to="/calificaciones" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-star me-1" />Calificaciones
          </NavLink>
          <NavLink to="/perfil" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-person-gear me-1" />Perfil
          </NavLink>
          {(esAdmin || rol === 'admin' || rol === 'soporte') && (
            <NavLink to="/usuarios" className="btn btn-outline-warning btn-sm fw-semibold">
              <i className="bi bi-shield-shaded me-1" />Usuarios (Staff)
            </NavLink>
          )}
        </div>

        <main className="container-fluid p-3 p-md-4 p-lg-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
