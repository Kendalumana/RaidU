import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';

const contarResultados = (data) => {
  if (typeof data.total_registros === 'number') return data.total_registros;
  if (typeof data.count === 'number') return data.count;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.results) || Array.isArray(data.resultados))
    return (data.results || data.resultados).length;
  return 0;
};

const obtenerTodosLosResultados = async (ruta) => {
  const { data: primeraPagina } = await api.get(ruta, { params: { page: 1 } });
  const resultadosIniciales = primeraPagina.resultados ?? primeraPagina.results ?? [];
  const totalPaginas = Number(primeraPagina.total_paginas ?? primeraPagina.total_pages ?? 1);

  if (totalPaginas <= 1) return resultadosIniciales;

  const paginasRestantes = await Promise.all(
    Array.from({ length: totalPaginas - 1 }, (_, indice) =>
      api.get(ruta, { params: { page: indice + 2 } })
    )
  );

  return [
    ...resultadosIniciales,
    ...paginasRestantes.flatMap(({ data }) => data.resultados ?? data.results ?? []),
  ];
};

export default function Dashboard() {
  const { user, rol, esAdmin } = useAuth();
  const [stats, setStats] = useState({
    vehiculos: null,
    viajes: null,
    reservas: null,
    cuposReservados: null,
    promedio: null,
    promedioError: false,
    totalUsuarios: null,
  });
  const [loadingCards, setLoadingCards] = useState({
    vehiculos: true,
    viajes: true,
    reservas: true,
    promedio: true,
    totalUsuarios: true,
  });
  const [failedCards, setFailedCards] = useState({});
  const [activeTab, setActiveTab] = useState('Todas');

  const esStaff = esAdmin || rol === 'admin' || rol === 'soporte';

  const cargarLista = useCallback(async (indicador, ruta) => {
    setLoadingCards((actual) => ({ ...actual, [indicador]: true }));
    setFailedCards((actual) => ({ ...actual, [indicador]: false }));

    try {
      const { data } = await api.get(ruta);
      setStats((actual) => ({ ...actual, [indicador]: contarResultados(data) }));
    } catch {
      setStats((actual) => ({ ...actual, [indicador]: null }));
      setFailedCards((actual) => ({ ...actual, [indicador]: true }));
    } finally {
      setLoadingCards((actual) => ({ ...actual, [indicador]: false }));
    }
  }, []);

  const cargarViajesReservables = useCallback(async () => {
    setLoadingCards((actual) => ({ ...actual, viajes: true }));
    setFailedCards((actual) => ({ ...actual, viajes: false }));

    try {
      const params = esStaff ? { disponibles: true } : { reservables: true };
      const { data } = await api.get('/viajes/', { params });
      setStats((actual) => ({ ...actual, viajes: data.total_registros }));
    } catch {
      setStats((actual) => ({ ...actual, viajes: null }));
      setFailedCards((actual) => ({ ...actual, viajes: true }));
    } finally {
      setLoadingCards((actual) => ({ ...actual, viajes: false }));
    }
  }, [esStaff, user?.id]);

  const cargarReservas = useCallback(async () => {
    setLoadingCards((actual) => ({ ...actual, reservas: true }));
    setFailedCards((actual) => ({ ...actual, reservas: false }));

    try {
      const reservas = await obtenerTodosLosResultados('/reservas/');
      const cuposReservados = reservas
        .filter((reserva) => reserva.estado !== 'cancelada')
        .reduce((total, reserva) => total + (Number(reserva.cupos) || 0), 0);
      setStats((actual) => ({
        ...actual,
        reservas: reservas.length,
        cuposReservados,
      }));
    } catch {
      setStats((actual) => ({ ...actual, reservas: null, cuposReservados: null }));
      setFailedCards((actual) => ({ ...actual, reservas: true }));
    } finally {
      setLoadingCards((actual) => ({ ...actual, reservas: false }));
    }
  }, []);

  const cargarPromedio = useCallback(async () => {
    if (!user?.id) {
      setLoadingCards((actual) => ({ ...actual, promedio: false }));
      setStats((actual) => ({ ...actual, promedio: null, promedioError: false }));
      return;
    }

    setLoadingCards((actual) => ({ ...actual, promedio: true }));
    setFailedCards((actual) => ({ ...actual, promedio: false }));
    try {
      const { data } = await api.get(`/calificaciones/promedio/${user.id}/`);
      setStats((actual) => ({
        ...actual,
        promedio: data.promedio ?? null,
        promedioError: false,
      }));
    } catch {
      setStats((actual) => ({ ...actual, promedio: null, promedioError: true }));
      setFailedCards((actual) => ({ ...actual, promedio: true }));
    } finally {
      setLoadingCards((actual) => ({ ...actual, promedio: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    cargarLista('vehiculos', '/vehiculos/?page=1');
    cargarViajesReservables();
    cargarReservas();
    cargarPromedio();
    if (esStaff) cargarLista('totalUsuarios', '/usuarios/?page=1');
  }, [cargarLista, cargarPromedio, cargarReservas, cargarViajesReservables, esStaff]);

  // Tarjetas principales 
  const statCards = [
    {
      id: 'vehiculos',
      label: esStaff ? 'Vehículos del sistema' : 'Mis Vehículos',
      value: stats.vehiculos ?? 'No disponible',
      loading: loadingCards.vehiculos,
      retry: () => cargarLista('vehiculos', '/vehiculos/?page=1'),
      unit: stats.vehiculos === null
        ? 'No se pudieron cargar los vehículos'
        : stats.vehiculos === 1 ? 'Vehículo registrado' : 'Vehículos registrados',
      unavailable: failedCards.vehiculos,
      icon: 'bi-car-front',
      iconColor: '#0284c7',
      iconBg: '#e0f2fe',
      pill: stats.vehiculos > 0 ? '▲ Conductor Activo' : '● Sin vehículo aún',
      pillColor: stats.vehiculos > 0 ? 'text-success bg-success-subtle' : 'text-secondary bg-light',
      to: '/vehiculos',
    },
    {
      id: 'viajes',
      label: esStaff ? 'Viajes con cupos en el sistema' : 'Viajes reservables',
      value: stats.viajes ?? 'No disponible',
      loading: loadingCards.viajes,
      retry: cargarViajesReservables,
      unit: stats.viajes === null
        ? 'No se pudieron cargar los viajes'
        : stats.viajes === 1 ? 'Viaje reservable' : 'Viajes reservables',
      unavailable: failedCards.viajes,
      icon: 'bi-compass',
      iconColor: '#8b5cf6',
      iconBg: '#f3e8ff',
      pill: stats.viajes > 0 ? '▲ En plataforma' : '● Sin viajes hoy',
      pillColor: stats.viajes > 0 ? 'text-success bg-success-subtle' : 'text-secondary bg-light',
      to: '/viajes',
    },
    {
      id: 'reservas',
      label: esStaff ? 'Reservas del sistema' : 'Mis Reservas',
      value: stats.reservas ?? 'No disponible',
      loading: loadingCards.reservas,
      retry: cargarReservas,
      unit: stats.reservas === null
        ? 'No se pudieron cargar las reservas'
        : `${stats.cuposReservados ?? 0} ${stats.cuposReservados === 1 ? 'cupo reservado' : 'cupos reservados'}`,
      unavailable: failedCards.reservas,
      icon: 'bi-ticket-perforated',
      iconColor: '#f59e0b',
      iconBg: '#fef3c7',
      pill: stats.reservas > 0 ? '● Historial al día' : '● Sin reservas',
      pillColor: stats.reservas > 0 ? 'text-warning bg-warning-subtle' : 'text-secondary bg-light',
      to: '/reservas',
    },
    {
      id: 'calificaciones',
      label: 'Mi Calificación',
      value: stats.promedioError
        ? 'No disponible'
        : stats.promedio !== null ? Number(stats.promedio).toFixed(1) : '-',
      loading: loadingCards.promedio,
      retry: cargarPromedio,
      unit: stats.promedioError
        ? 'No se pudo consultar el promedio'
        : stats.promedio !== null ? 'Puntaje de 5.0' : 'Sin calificaciones',
      unavailable: failedCards.promedio,
      icon: 'bi-star',
      iconColor: '#10b981',
      iconBg: '#d1fae5',
      pill: stats.promedio !== null ? '★ Promedio real' : '● Nueva cuenta',
      pillColor: stats.promedio !== null ? 'text-success bg-success-subtle' : 'text-secondary bg-light',
      to: '/calificaciones',
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      {/* ── Encabezado de Inicio ── */}
      <div className="welcome-banner d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <span className="badge rounded-pill mb-2" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: '0.72rem' }}>
            <i className="bi bi-geo-alt-fill me-1" />
            UCR • Sede del Pacífico
          </span>
          <h1 className="h4 fw-bold mb-1">Inicio • Movilidad UCR</h1>
          <p className="small mb-0">
            Plataforma oficial de transporte compartido universitario
          </p>
        </div>

        {/* Badge de usuario */}
        <div className="d-flex align-items-center flex-wrap gap-2">
          <span className="role-badge">
            <i className="bi bi-person-circle" />
            {user?.first_name || user?.username || 'Estudiante'} • {rol?.toUpperCase() || 'ESTUDIANTE'}
          </span>
          {esStaff && (
            <span className={`badge px-3 py-2 rounded-pill ${esAdmin ? 'bg-danger text-white' : 'bg-warning text-dark'}`}>
              <i className="bi bi-shield-check me-1" />
              {esAdmin ? 'Admin' : 'Soporte'}
            </span>
          )}
        </div>
      </div>

      {/* ── Panel Staff Exclusivo (si es Admin o Soporte) ── */}
      {esStaff && (
        <div className="alert bg-white border border-start border-4 border-danger shadow-sm rounded-4 p-3 d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <div className="d-flex align-items-center gap-3">
            <div className="stat-icon bg-danger bg-opacity-10 text-danger">
              <i className="bi bi-shield-lock-fill" />
            </div>
            <div>
              <div className="fw-bold text-dark">Acceso de Personal ({rol?.toUpperCase()})</div>
              <div className="text-secondary small">
                {loadingCards.totalUsuarios
                  ? 'Consultando total de cuentas...'
                  : stats.totalUsuarios === null
                  ? 'No disponible: no se pudo consultar el total de cuentas.'
                  : stats.totalUsuarios > 0
                  ? `Se registran ${stats.totalUsuarios} cuentas en el sistema.`
                  : 'Gestión y auditoría de la plataforma RaidU.'}
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {failedCards.totalUsuarios && !loadingCards.totalUsuarios && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                onClick={() => cargarLista('totalUsuarios', '/usuarios/?page=1')}
              >
                <i className="bi bi-arrow-clockwise me-1" />
                Reintentar
              </button>
            )}
            <Link to="/usuarios" className="btn btn-outline-danger btn-sm rounded-pill px-3">
              <i className="bi bi-people-fill me-1" />
              Ver Usuarios UCR
            </Link>
          </div>
        </div>
      )}

      {/* ── 4 Tarjetas de Estadísticas Principales ── */}
      <div className="row g-3">
        {statCards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.id}>
            <div className="h-100 d-flex flex-column gap-2">
              <Link to={card.to} className="text-decoration-none flex-grow-1">
                <div className={`stat-card-white h-100 d-flex flex-column justify-content-between ${card.unavailable && !card.loading ? 'is-error' : ''}`}>
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <div
                      className="stat-icon"
                      style={{
                        backgroundColor: card.iconBg,
                        color: card.iconColor,
                      }}
                    >
                      <i className={`bi ${card.icon}`} aria-hidden="true" />
                    </div>
                    <span className={`badge rounded-pill px-2 py-1 small fw-semibold ${card.loading ? 'text-secondary bg-light' : card.unavailable ? 'text-danger bg-danger-subtle' : card.pillColor}`}>
                      {card.loading ? 'Cargando...' : card.unavailable ? 'Error de consulta' : card.pill}
                    </span>
                  </div>

                  <div>
                    <div className={`stat-value ${!card.loading && typeof card.value === 'string' && card.value.length > 5 ? 'is-text' : ''}`}>
                      {card.loading ? (
                        <span
                          className="skeleton"
                          style={{ width: 72, height: 28 }}
                          role="status"
                          aria-label="Cargando"
                        />
                      ) : (
                        card.value
                      )}
                    </div>
                    <div className="text-dark small fw-semibold mt-2">{card.label}</div>
                    <div className="text-muted small mt-1" style={{ fontSize: '0.76rem' }}>
                      {card.loading ? (
                        <span className="skeleton" style={{ width: '70%', height: 12 }} />
                      ) : (
                        card.unit
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              {card.unavailable && !card.loading && (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center gap-1"
                  onClick={card.retry}
                >
                  <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                  Reintentar {card.id === 'calificaciones' ? 'calificación' : card.label.toLowerCase()}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Accesos a los Módulos ── */}
      <div className="card-white p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
          <div>
            <h5 className="fw-bold mb-1">
              <i className="bi bi-grid-fill text-primary me-2" />
              Módulos del Sistema
            </h5>
            <p className="text-secondary small mb-0">Acceso rápido a las operaciones del proyecto</p>
          </div>
          <div className="d-flex gap-1 bg-light p-1 rounded-pill border">
            {['Todas', 'Operación', 'Gestión'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold border-0 ${
                  activeTab === tab ? 'btn-primary shadow-sm' : 'text-secondary bg-transparent'
                }`}
                style={{ fontSize: '0.76rem' }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap pt-2">
          {(activeTab === 'Todas' || activeTab === 'Operación') && (
            <>
              <Link to="/viajes" className="btn btn-outline-success btn-sim-action flex-grow-1">
                <i className="bi bi-map" />
                Viajes & Rutas
              </Link>
              <Link to="/reservas" className="btn btn-outline-warning btn-sim-action flex-grow-1">
                <i className="bi bi-ticket-perforated" />
                Reservas
              </Link>
              <Link to="/calificaciones" className="btn btn-outline-info btn-sim-action flex-grow-1">
                <i className="bi bi-star" />
                Calificaciones
              </Link>
            </>
          )}

          {(activeTab === 'Todas' || activeTab === 'Gestión') && (
            <>
              <Link to="/vehiculos" className="btn btn-outline-primary btn-sim-action flex-grow-1">
                <i className="bi bi-car-front" />
                Vehículos
              </Link>
              <Link to="/perfil" className="btn btn-outline-secondary btn-sim-action flex-grow-1">
                <i className="bi bi-person-gear" />
                Mi Perfil
              </Link>
              {esStaff && (
                <Link to="/usuarios" className="btn btn-outline-danger btn-sim-action flex-grow-1">
                  <i className="bi bi-people-fill" />
                  Gestión Usuarios (Staff)
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
