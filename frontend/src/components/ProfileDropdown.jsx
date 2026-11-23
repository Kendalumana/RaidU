import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function ProfileDropdown() {
  const { user, rol, logout, esConductor, esAdmin, esSoporte } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const rolColors = {
    admin: { clase: 'admin', icono: 'bi-shield-lock-fill', label: 'Admin' },
    soporte: { clase: 'soporte', icono: 'bi-headset', label: 'Soporte' },
    estudiante: {
      clase: esConductor ? 'conductor' : 'estudiante',
      icono: esConductor ? 'bi-car-front-fill' : 'bi-mortarboard-fill',
      label: esConductor ? 'Estudiante / Conductor' : 'Estudiante UCR',
    },
  };

  const currentRol = rolColors[rol] || rolColors.estudiante;
  const initial = (user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase();

  return (
    <div className="position-relative" ref={dropdownRef}>
      {/* Botón trigger del menú de perfil */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn d-flex align-items-center gap-2 border-0 bg-transparent p-1 rounded-pill"
        style={{
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        aria-expanded={open}
      >
        {/* Avatar redondo con gradiente institucional */}
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
          style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, var(--raidu-primary), var(--raidu-accent))',
            fontSize: '0.95rem',
          }}
        >
          {initial}
        </div>

        {/* Nombre y rol en pantallas medianas/grandes */}
        <div className="d-none d-md-flex flex-column text-start" style={{ lineHeight: 1.2 }}>
          <span className="fw-semibold text-dark small" style={{ fontSize: '0.86rem' }}>
            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Usuario'}
          </span>
          <span className={`role-badge role-badge--${currentRol.clase} mt-1`} style={{ fontSize: '0.64rem', padding: '0.18rem 0.55rem' }}>
            <i className={`bi ${currentRol.icono}`} aria-hidden="true" />
            {currentRol.label}
          </span>
        </div>

        <i
          className={`bi bi-chevron-down text-secondary ms-1 ${open ? 'rotate-180' : ''}`}
          style={{
            fontSize: '0.75rem',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Menú desplegable */}
      {open && (
        <div
          className="position-absolute end-0 mt-2 bg-white rounded-4 p-2"
          style={{
            minWidth: 264,
            zIndex: 1050,
            animation: 'fadeIn 0.15s ease-out',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--slate-200)',
          }}
        >
          {/* Header del dropdown */}
          <div className="p-3 border-bottom d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                background: 'linear-gradient(135deg, var(--raidu-primary), var(--raidu-accent))',
                fontSize: '1.05rem',
              }}
            >
              {initial}
            </div>
            <div className="overflow-hidden">
              <p className="fw-bold mb-0 text-dark text-truncate" style={{ fontSize: '0.9rem' }}>
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Estudiante UCR'}
              </p>
              <p className="text-secondary small mb-1 text-truncate" style={{ fontSize: '0.75rem' }}>
                {user?.email || 'estudiante@ucr.ac.cr'}
              </p>
              <span className={`role-badge role-badge--${currentRol.clase}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.55rem' }}>
                <i className={`bi ${currentRol.icono}`} aria-hidden="true" />
                {currentRol.label}
              </span>
            </div>
          </div>

          {/* Opciones del menú */}
          <div className="py-2">
            <Link
              to="/perfil"
              onClick={() => setOpen(false)}
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-3 text-secondary text-decoration-none"
              style={{ fontSize: '0.875rem' }}
            >
              <i className="bi bi-person-gear text-primary fs-5" />
              <span>Mi Perfil</span>
            </Link>

            <Link to="/ajustes" onClick={() => setOpen(false)}
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-3 text-secondary text-decoration-none"
              style={{ fontSize: '0.875rem' }}>
              <i className="bi bi-gear text-secondary fs-5" />
              <span>Ajustes</span>
            </Link>

          </div>

          <div className="border-top pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-3 text-danger border-0 bg-transparent w-100"
              style={{ fontSize: '0.875rem' }}
            >
              <i className="bi bi-box-arrow-right fs-5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
