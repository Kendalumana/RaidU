import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import ProfileDropdown from './ProfileDropdown.jsx';
import UcrLogo from './UcrLogo.jsx';

// Presentación del rol autenticado (solo visual, no altera permisos).
function obtenerRolVisual({ rol, esAdmin, esSoporte, esConductor }) {
  if (esAdmin || rol === 'admin') {
    return { clase: 'admin', icono: 'bi-shield-lock-fill', label: 'Admin', corto: 'Admin' };
  }
  if (esSoporte || rol === 'soporte') {
    return { clase: 'soporte', icono: 'bi-headset', label: 'Soporte', corto: 'Soporte' };
  }
  if (esConductor) {
    return { clase: 'conductor', icono: 'bi-car-front-fill', label: 'Estudiante · Conductor', corto: 'Conductor' };
  }
  return { clase: 'estudiante', icono: 'bi-mortarboard-fill', label: 'Estudiante', corto: 'Estudiante' };
}

export default function AppLayout() {
  const { rol, esAdmin, esSoporte, esConductor } = useAuth();
  const location = useLocation();
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  const esStaff = esAdmin || rol === 'admin' || rol === 'soporte';
  const rolVisual = obtenerRolVisual({ rol, esAdmin, esSoporte, esConductor });

  const navItems = [
    { to: '/', end: true, icon: 'bi-speedometer2', label: 'Inicio' },
    { to: '/vehiculos', icon: 'bi-car-front', label: 'Vehículos' },
    { to: '/viajes', icon: 'bi-map', label: 'Viajes' },
    { to: '/reservas', icon: 'bi-bookmark-check', label: 'Reservas' },
    { to: '/calificaciones', icon: 'bi-star', label: 'Calificaciones' },
    ...(esStaff
      ? [{ to: '/usuarios', icon: 'bi-people-fill', label: 'Usuarios UCR' }]
      : []),
  ];

  const titulosExtra = { '/perfil': 'Mi Perfil', '/ajustes': 'Ajustes' };
  const seccionActual =
    navItems.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )?.label ||
    titulosExtra[location.pathname] ||
    'RaidU';

  // Cerrar el menú móvil con Escape.
  useEffect(() => {
    if (!menuMovilAbierto) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuMovilAbierto(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuMovilAbierto]);

  return (
    <div className="app-shell">
      {/* ── Sidebar de escritorio ── */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <UcrLogo />
        </div>

        <p className="sidebar-label">Módulos del Sistema</p>
        <nav className="nav flex-column gap-1" aria-label="Menú principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className={`role-badge role-badge--${rolVisual.clase} mb-2`}>
            <i className={`bi ${rolVisual.icono}`} aria-hidden="true" />
            {rolVisual.label}
          </span>
          <p className="fw-semibold text-dark mb-0">RaidU v2.0</p>
          <span>React 19 + Django REST</span>
        </div>
      </aside>

      {/* ── Drawer de navegación móvil ── */}
      {menuMovilAbierto && (
        <div
          className="mobile-drawer-backdrop d-lg-none"
          onClick={() => setMenuMovilAbierto(false)}
        >
          <div
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
              <UcrLogo compact height={36} />
              <button
                type="button"
                className="topbar-icon-btn"
                onClick={() => setMenuMovilAbierto(false)}
                aria-label="Cerrar menú"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="mb-3">
              <span className={`role-badge role-badge--${rolVisual.clase}`}>
                <i className={`bi ${rolVisual.icono}`} aria-hidden="true" />
                {rolVisual.label}
              </span>
            </div>

            <p className="sidebar-label">Navegación</p>
            <nav className="nav flex-column gap-1" aria-label="Menú móvil">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuMovilAbierto(false)}
                  className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                >
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto pt-3 border-top text-center text-secondary small">
              <span className="fw-semibold text-dark">RaidU UCR</span> • Sede del Pacífico
            </div>
          </div>
        </div>
      )}

      {/* ── Área principal ── */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="d-flex align-items-center gap-2 gap-sm-3 min-w-0" style={{ minWidth: 0 }}>
            <button
              type="button"
              className="topbar-icon-btn d-lg-none"
              onClick={() => setMenuMovilAbierto(true)}
              aria-label="Abrir menú de navegación"
              aria-expanded={menuMovilAbierto}
            >
              <i className="bi bi-list fs-4" />
            </button>
            <span className="d-none d-sm-inline-flex d-lg-none">
              <UcrLogo compact height={32} />
            </span>
            <div className="topbar-section">
              <span className="topbar-section-eyebrow">RaidU · UCR</span>
              <span className="topbar-section-title">{seccionActual}</span>
            </div>
          </div>

          <div className="ms-auto d-flex align-items-center gap-2 gap-md-3">
            <span className="status-pill d-none d-md-inline-flex">
              <span className="dot" aria-hidden="true" />
              Sistema conectado
            </span>
            <span
              className={`role-badge role-badge--${rolVisual.clase} d-inline-flex d-md-none`}
              title={`Rol: ${rolVisual.label}`}
            >
              <i className={`bi ${rolVisual.icono}`} aria-hidden="true" />
              {rolVisual.corto}
            </span>
            <ProfileDropdown />
          </div>
        </header>

        <main className="container-fluid p-3 p-md-4 p-xl-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
