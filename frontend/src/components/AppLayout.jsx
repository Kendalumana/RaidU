import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AppLayout() {
  const { user, rol, logout } = useAuth();
  const navigate = useNavigate();

  const exit = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const rolBadge = {
    admin: 'bg-danger',
    soporte: 'bg-warning text-dark',
    estudiante: 'bg-primary',
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar (escritorio) ── */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <i className="bi bi-car-front-fill text-primary me-2" />
          RaidU
        </div>
        <p className="sidebar-label">NAVEGACIÓN</p>
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
          {(rol === 'admin' || rol === 'soporte') && (
            <NavLink to="/usuarios" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <i className="bi bi-people me-2" />Usuarios
            </NavLink>
          )}
          <NavLink to="/perfil" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="bi bi-person-gear me-2" />Mi Perfil
          </NavLink>
        </nav>
        <div className="sidebar-bottom">UCR – Sede del Pacífico</div>
      </aside>

      {/* ── Área principal ── */}
      <div className="app-main">
        <header className="app-topbar">
          <span className="d-md-none fw-bold text-primary">
            <i className="bi bi-car-front-fill me-2" />RaidU
          </span>
          <div className="ms-auto d-flex align-items-center gap-3">
            <span className={`badge ${rolBadge[rol] || 'bg-secondary'} text-uppercase`}>{rol}</span>
            <span className="small text-secondary">
              <i className="bi bi-person-circle me-1" />
              {user?.first_name || user?.username || 'Usuario'}
            </span>
            <button className="btn btn-outline-danger btn-sm" onClick={exit}>
              <i className="bi bi-box-arrow-right me-1" />Salir
            </button>
          </div>
        </header>

        {/* ── Links móviles ── */}
        <div className="mobile-links d-md-none px-3 pt-3 d-flex gap-2 flex-wrap">
          <NavLink to="/" end className="btn btn-outline-primary btn-sm">Dashboard</NavLink>
          <NavLink to="/vehiculos" className="btn btn-outline-primary btn-sm">Vehículos</NavLink>
          <NavLink to="/viajes" className="btn btn-outline-primary btn-sm">Viajes</NavLink>
          <NavLink to="/reservas" className="btn btn-outline-primary btn-sm">Reservas</NavLink>
          <NavLink to="/calificaciones" className="btn btn-outline-primary btn-sm">Calificaciones</NavLink>
          <NavLink to="/perfil" className="btn btn-outline-primary btn-sm">Perfil</NavLink>
        </div>

        <main className="container-fluid p-3 p-md-4 p-lg-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
