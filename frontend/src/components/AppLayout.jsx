import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import ProfileDropdown from './ProfileDropdown.jsx';
import UcrLogo from './UcrLogo.jsx';

export default function AppLayout() {
  const { user, rol, esAdmin } = useAuth();
  const location = useLocation();
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  const esStaff = esAdmin || rol === 'admin' || rol === 'soporte';

  const navItems = [
    { to: '/', end: true, icon: 'bi-speedometer2', label: 'Inicio' },
    { to: '/vehiculos', icon: 'bi-truck', label: 'Vehículos' },
    { to: '/viajes', icon: 'bi-map', label: 'Viajes' },
    { to: '/reservas', icon: 'bi-bookmark-check', label: 'Reservas' },
    { to: '/calificaciones', icon: 'bi-star', label: 'Calificaciones' },
    ...(esStaff
      ? [{ to: '/usuarios', icon: 'bi-people-fill', label: 'Usuarios UCR' }]
      : []),
    { to: '/perfil', icon: 'bi-person-circle', label: 'Mi Perfil' },
  ];

  // En móvil: Perfil se mantiene en el menú del avatar; Calificaciones
  // también queda visible en el menú lateral.
  const navItemsMovil = navItems.filter(
    (item) => item.to !== '/perfil'
  );

  return (
    <div className="app-shell">
      {/* ── Sidebar Desktop Minimalista Blanco ── */}
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
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <p className="fw-semibold text-dark mb-0">RaidU v2.0</p>
          <span>React 19 + Django REST</span>
        </div>
      </aside>

      {/* ── Drawer / Menú Lateral para Móvil (Offcanvas limpio) ── */}
      {menuMovilAbierto && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 1060, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)' }}
          onClick={() => setMenuMovilAbierto(false)}
        >
          <div
            className="bg-white h-100 d-flex flex-column p-4 shadow-lg"
            style={{ width: '82%', maxWidth: 310, animation: 'slideRight 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Menú Móvil */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
              <UcrLogo compact height={36} />
              <button
                type="button"
                className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center"
                onClick={() => setMenuMovilAbierto(false)}
                aria-label="Cerrar menú"
                style={{ width: 36, height: 36 }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <p className="sidebar-label">Navegación</p>
            <nav className="nav flex-column gap-2">
              {navItemsMovil.map((item) => {
                const activo = item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuMovilAbierto(false)}
                    className="d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none fw-medium"
                    style={{
                      backgroundColor: activo ? '#0284c7' : 'transparent',
                      color: activo ? '#ffffff' : '#334155',
                      fontSize: '0.92rem',
                    }}
                  >
                    <i
                      className={`bi ${item.icon}`}
                      style={{
                        fontSize: '1.2rem',
                        color: activo ? '#ffffff' : '#64748b',
                      }}
                    />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-auto pt-3 border-top text-center text-secondary small">
              <span className="fw-semibold text-dark">RaidU UCR</span> • Sede del Pacífico
            </div>
          </div>
        </div>
      )}

      {/* ── Área Principal ── */}
      <div className="app-main">
        {/* ── Topbar Minimalista ── */}
        <header className="app-topbar">
          {/* Botón de Menú Hamburguesa + Logo en móvil */}
          <div className="d-flex align-items-center gap-2 d-lg-none">
            <button
              type="button"
              className="btn btn-light rounded-circle border-0 d-flex align-items-center justify-content-center"
              onClick={() => setMenuMovilAbierto(true)}
              style={{ width: 40, height: 40 }}
              aria-label="Abrir menú de navegación"
            >
              <i className="bi bi-list fs-4 text-dark" />
            </button>
            <UcrLogo compact height={32} />
          </div>

          {/* Barra de búsqueda interactiva (desktop) */}
          <div className="topbar-search d-none d-md-block position-relative">
            <i
              className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"
              style={{ fontSize: '0.85rem' }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar viajes, rutas, conductores o sedes..."
              aria-label="Buscar"
            />
          </div>

          {/* Menú de perfil a la derecha con dropdown interactivo */}
          <div className="ms-auto d-flex align-items-center gap-3">
            <div className="d-none d-sm-flex align-items-center gap-2 px-3 py-1 bg-light rounded-pill border">
              <span className="spinner-grow spinner-grow-sm text-success" style={{ width: 8, height: 8 }} />
              <span className="text-secondary small fw-medium" style={{ fontSize: '0.75rem' }}>
                Sistema Conectado
              </span>
            </div>

            <ProfileDropdown />
          </div>
        </header>

        {/* ── Contenido de las páginas ── */}
        <main className="container-fluid p-3 p-md-4 p-xl-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
