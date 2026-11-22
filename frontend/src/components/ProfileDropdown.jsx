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
    admin: { bg: '#fee2e2', text: '#991b1b', label: 'Admin' },
    soporte: { bg: '#fef3c7', text: '#92400e', label: 'Soporte' },
    estudiante: {
      bg: esConductor ? '#ecfdf5' : '#e0e7ff',
      text: esConductor ? '#065f46' : '#3730a3',
      label: esConductor ? 'Estudiante / Conductor' : 'Estudiante UCR',
    },
  };

  const currentRol = rolColors[rol] || rolColors.estudiante;
  const initial = (user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase();

  return (
    <div className="position-relative" ref={dropdownRef}>
      {/* Botón trigger estilo Dribbble */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn d-flex align-items-center gap-2 border-0 bg-transparent p-1 rounded-pill"
        style={{
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
        aria-expanded={open}
      >
        {/* Avatar redondo con gradiente suave */}
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
          style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            fontSize: '1rem',
          }}
        >
          {initial}
        </div>

        {/* Nombre y rol en pantallas medianas/grandes */}
        <div className="d-none d-md-flex flex-column text-start" style={{ lineHeight: 1.2 }}>
          <span className="fw-semibold text-dark small" style={{ fontSize: '0.875rem' }}>
            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Usuario'}
          </span>
          <span
            className="badge rounded-pill mt-1"
            style={{
              backgroundColor: currentRol.bg,
              color: currentRol.text,
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              width: 'fit-content',
            }}
          >
            {currentRol.label}
          </span>
        </div>

        <i
          className={`bi bi-chevron-down text-secondary ms-1 transition-transform ${open ? 'rotate-180' : ''}`}
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
          className="position-absolute end-0 mt-2 shadow-lg bg-white rounded-4 border-0 p-2"
          style={{
            minWidth: 260,
            zIndex: 1050,
            animation: 'fadeIn 0.15s ease-out',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          {/* Header del dropdown */}
          <div className="p-3 border-bottom d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              style={{
                width: 44,
                height: 44,
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                fontSize: '1.1rem',
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
              <span
                className="badge rounded-pill"
                style={{
                  backgroundColor: currentRol.bg,
                  color: currentRol.text,
                  fontSize: '0.65rem',
                }}
              >
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

            <Link
              to="/ajustes"
              onClick={() => setOpen(false)}
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-3 text-secondary text-decoration-none"
              style={{ fontSize: '0.875rem' }}
            >
              <i className="bi bi-gear text-secondary fs-5" />
              <span>Ajustes de Cuenta</span>
            </Link>

            {/* Mis Vehículos: Solo se muestra si es conductor (o admin/soporte) */}
            {(esConductor || esAdmin || esSoporte) && (
              <Link
                to="/vehiculos"
                onClick={() => setOpen(false)}
                className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-3 text-secondary text-decoration-none"
                style={{ fontSize: '0.875rem' }}
              >
                <i className="bi bi-truck text-info fs-5" />
                <span>Mis Vehículos</span>
              </Link>
            )}

            {/* Mis Reservas */}
            <Link
              to="/reservas"
              onClick={() => setOpen(false)}
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-3 text-secondary text-decoration-none"
              style={{ fontSize: '0.875rem' }}
            >
              <i className="bi bi-bookmark-check-fill text-success fs-5" />
              <span>Mis Reservas</span>
            </Link>

            <Link
              to="/calificaciones"
              onClick={() => setOpen(false)}
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-3 text-secondary text-decoration-none"
              style={{ fontSize: '0.875rem' }}
            >
              <i className="bi bi-star text-warning fs-5" />
              <span>Calificaciones & Reseñas</span>
            </Link>

            {(rol === 'admin' || rol === 'soporte') && (
              <Link
                to="/usuarios"
                onClick={() => setOpen(false)}
                className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-3 text-secondary text-decoration-none"
                style={{ fontSize: '0.875rem' }}
              >
                <i className="bi bi-shield-check text-danger fs-5" />
                <span>Panel de Usuarios</span>
              </Link>
            )}
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
