import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, rol, esAdmin } = useAuth();

  /* ── Estadísticas para usuario estándar ── */
  const [stats, setStats] = useState({
    vehiculos: 0,
    viajes: 0,
    reservas: 0,
    promedio: null,
  });

  /* ── Estadísticas globales para rol is_staff (Administrador) ── */
  const [statsAdmin, setStatsAdmin] = useState({
    totalUsuarios: 0,
    totalVehiculos: 0,
    totalViajes: 0,
    totalReservas: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const contarResultados = (r) => {
          if (r.status !== 'fulfilled') return 0;
          const d = r.value.data;
          if (typeof d.total_registros === 'number') return d.total_registros;
          if (typeof d.count === 'number') return d.count;
          if (Array.isArray(d)) return d.length;
          if (Array.isArray(d.results) || Array.isArray(d.resultados)) {
            return (d.results || d.resultados).length;
          }
          return 0;
        };

        // Si el usuario es administrador (is_staff), consultamos métricas globales
        if (esAdmin) {
          const [resUsuarios, resVehiculos, resViajes, resReservas] = await Promise.allSettled([
            api.get('/usuarios/?page=1'),
            api.get('/vehiculos/?page=1'),
            api.get('/viajes/?page=1'),
            api.get('/reservas/?page=1'),
          ]);

          setStatsAdmin({
            totalUsuarios: contarResultados(resUsuarios),
            totalVehiculos: contarResultados(resVehiculos),
            totalViajes: contarResultados(resViajes),
            totalReservas: contarResultados(resReservas),
          });
        }

        // Consultas generales del usuario
        const [veh, via, res] = await Promise.allSettled([
          api.get('/vehiculos/?page=1'),
          api.get('/viajes/?page=1'),
          api.get('/reservas/?page=1'),
        ]);

        let promedio = null;
        if (user?.id) {
          try {
            const { data } = await api.get(`/calificaciones/promedio/${user.id}/`);
            promedio = data.promedio;
          } catch {
            // Sin calificaciones registradas todavía
          }
        }

        setStats({
          vehiculos: contarResultados(veh),
          viajes: contarResultados(via),
          reservas: contarResultados(res),
          promedio,
        });
      } catch {
        // Silenciar fallos menores
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [user?.id, esAdmin]);

  /* ── Tarjetas para estudiante normal ── */
  const cardsEstudiante = [
    {
      icon: 'bi-truck',
      color: 'primary',
      label: 'Mis Vehículos Registrados',
      value: stats.vehiculos,
      to: '/vehiculos',
      sublabel: 'Gestionar o registrar nuevos',
    },
    {
      icon: 'bi-map',
      color: 'success',
      label: 'Viajes Disponibles',
      value: stats.viajes,
      to: '/viajes',
      sublabel: 'Rutas intersedes UCR',
    },
    {
      icon: 'bi-bookmark-check',
      color: 'info',
      label: 'Mis Reservas',
      value: stats.reservas,
      to: '/reservas',
      sublabel: 'Cupos reservados activos',
    },
    {
      icon: 'bi-star-fill',
      color: 'warning',
      label: 'Mi Calificación',
      value: stats.promedio !== null ? Number(stats.promedio).toFixed(1) : '—',
      to: '/calificaciones',
      sublabel: stats.promedio !== null ? 'Promedio general' : 'Sin valoraciones aún',
    },
  ];

  /* ── Tarjetas globales exclusivas para is_staff (Administrador) ── */
  const cardsAdmin = [
    {
      icon: 'bi-people-fill',
      color: 'primary',
      label: 'Estudiantes / Usuarios',
      value: statsAdmin.totalUsuarios,
      to: '/usuarios',
      desc: 'Cuentas registradas en RaidU',
    },
    {
      icon: 'bi-truck-front-fill',
      color: 'info',
      label: 'Total Vehículos',
      value: statsAdmin.totalVehiculos,
      to: '/vehiculos',
      desc: 'Flota registrada en el sistema',
    },
    {
      icon: 'bi-map-fill',
      color: 'success',
      label: 'Total Viajes',
      value: statsAdmin.totalViajes,
      to: '/viajes',
      desc: 'Viajes publicados y en curso',
    },
    {
      icon: 'bi-bookmark-star-fill',
      color: 'warning',
      label: 'Total Reservas',
      value: statsAdmin.totalReservas,
      to: '/reservas',
      desc: 'Historial global de cupos',
    },
  ];

  return (
    <>
      {/* ── Encabezado principal ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">
            Dashboard
            {esAdmin && <span className="badge bg-danger ms-2 fs-6">Panel Staff</span>}
          </h1>
          <p className="text-secondary mb-0">
            Bienvenido, <strong>{user?.first_name || user?.username || 'Usuario'}</strong>
            <span className="badge bg-secondary ms-2 text-uppercase">{rol}</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-secondary">Cargando indicadores del sistema…</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════
              SECCIÓN ADMINISTRATIVA EXCLUSIVA (is_staff === true)
              ══════════════════════════════════════════════════ */}
          {esAdmin && (
            <div className="mb-5">
              <div className="card border-0 shadow-sm border-start border-4 border-danger mb-4">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-danger bg-opacity-10 rounded-3 p-3 text-danger">
                        <i className="bi bi-shield-shaded fs-2" />
                      </div>
                      <div>
                        <h4 className="fw-bold mb-1">Estadísticas Globales de la Plataforma</h4>
                        <p className="text-secondary small mb-0">
                          Métricas globales calculadas en tiempo real desde la API REST (Acceso restringido a personal Staff).
                        </p>
                      </div>
                    </div>
                    <Link to="/usuarios" className="btn btn-danger btn-sm shadow-sm">
                      <i className="bi bi-people-fill me-1" />Gestionar Usuarios & Moderación
                    </Link>
                  </div>

                  {/* KPIs Globales */}
                  <div className="row g-3 pt-2">
                    {cardsAdmin.map((c) => (
                      <div className="col-sm-6 col-lg-3" key={c.label}>
                        <Link to={c.to} className="text-decoration-none">
                          <div className={`card border-0 shadow-sm border-start border-4 border-${c.color} h-100 bg-light`}>
                            <div className="card-body p-3">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <p className="text-secondary small fw-semibold text-uppercase mb-1">{c.label}</p>
                                  <h2 className="fw-bold text-dark mb-0">{c.value}</h2>
                                  <span className="text-muted small">{c.desc}</span>
                                </div>
                                <div className={`bg-${c.color} bg-opacity-10 rounded-2 p-2 text-${c.color}`}>
                                  <i className={`bi ${c.icon} fs-4`} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              SECCIÓN DE USUARIO / ESTUDIANTE
              ══════════════════════════════════════════════════ */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="fw-bold text-dark mb-0">
              <i className="bi bi-speedometer2 text-primary me-2" />
              {esAdmin ? 'Mis Actividades Personales' : 'Mis Indicadores'}
            </h5>
          </div>

          <div className="row g-4">
            {cardsEstudiante.map((c) => (
              <div className="col-sm-6 col-lg-3" key={c.label}>
                <Link to={c.to} className="text-decoration-none">
                  <div className={`card border-0 shadow-sm border-start border-4 border-${c.color} h-100`}>
                    <div className="card-body d-flex align-items-center gap-3 p-4">
                      <div className={`bg-${c.color} bg-opacity-10 rounded-3 p-3`}>
                        <i className={`bi ${c.icon} text-${c.color} fs-3`} />
                      </div>
                      <div>
                        <p className="text-secondary small fw-semibold mb-0">{c.label}</p>
                        <h3 className="fw-bold text-dark mb-0">{c.value}</h3>
                        <span className="text-muted small">{c.sublabel}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════
              ACCESOS RÁPIDOS
              ══════════════════════════════════════════════════ */}
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-lightning-charge-fill text-warning me-2" />
                Accesos directos
              </h5>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/viajes" className="btn btn-outline-success btn-sm">
                  <i className="bi bi-search me-1" />Buscar o publicar viaje
                </Link>
                <Link to="/vehiculos" className="btn btn-outline-primary btn-sm">
                  <i className="bi bi-plus-lg me-1" />Registrar vehículo
                </Link>
                <Link to="/reservas" className="btn btn-outline-info btn-sm">
                  <i className="bi bi-bookmark-check me-1" />Ver mis reservas
                </Link>
                <Link to="/perfil" className="btn btn-outline-secondary btn-sm">
                  <i className="bi bi-person-gear me-1" />Mi perfil
                </Link>
                {esAdmin && (
                  <Link to="/usuarios" className="btn btn-outline-danger btn-sm fw-semibold">
                    <i className="bi bi-shield-shaded me-1" />Panel de moderación de usuarios
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
