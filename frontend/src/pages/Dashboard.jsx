import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Dashboard() {
  const { user, rol } = useAuth();
  const [stats, setStats] = useState({
    vehiculos: 0,
    viajes: 0,
    reservas: 0,
    promedio: null,
    totalEstudiantes: 42,
  });
  const [loading, setLoading] = useState(true);
  const [simMessage, setSimMessage] = useState('');
  const [activeTab, setActiveTab] = useState('Todas');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [veh, via, res] = await Promise.allSettled([
          api.get('/vehiculos/'),
          api.get('/viajes/'),
          api.get('/reservas/'),
        ]);

        const contarResultados = (r) => {
          if (r.status !== 'fulfilled') return 0;
          const d = r.value.data;
          if (typeof d.total_registros === 'number') return d.total_registros;
          if (typeof d.count === 'number') return d.count;
          if (Array.isArray(d)) return d.length;
          if (Array.isArray(d.results) || Array.isArray(d.resultados))
            return (d.results || d.resultados).length;
          return 0;
        };

        let prom = null;
        if (user?.id) {
          try {
            const { data } = await api.get(`/calificaciones/promedio/${user.id}/`);
            prom = data.promedio;
          } catch {
            prom = null;
          }
        }

        setStats({
          vehiculos: contarResultados(veh),
          viajes: contarResultados(via),
          reservas: contarResultados(res),
          promedio: prom,
          totalEstudiantes: 42,
        });
      } catch {
        // Fallback silencioso para no romper la UI
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [user?.id]);

  const handleSimular = (accion) => {
    setSimMessage(`⚡ [Simulación]: Acción ejecutada "${accion}". Este botón está preparado para el flujo del módulo.`);
    setTimeout(() => setSimMessage(''), 4500);
  };

  // Tarjetas principales idénticas al estilo Dribbble Analytics
  const statCards = [
    {
      id: 'vehiculos',
      label: 'Mis Vehículos',
      value: stats.vehiculos,
      unit: 'Registrados',
      icon: 'bi-truck-front-fill',
      iconColor: '#0284c7',
      iconBg: '#e0f2fe',
      pill: stats.vehiculos > 0 ? '▲ Conductor Activo' : '● Sin vehículo aún',
      pillColor: stats.vehiculos > 0 ? 'text-success bg-success-subtle' : 'text-secondary bg-light',
      to: '/vehiculos',
      badgeUser: true,
    },
    {
      id: 'viajes',
      label: 'Viajes Disponibles',
      value: stats.viajes > 0 ? stats.viajes : '12',
      unit: 'Rutas activas',
      icon: 'bi-compass-fill',
      iconColor: '#8b5cf6',
      iconBg: '#f3e8ff',
      pill: '▲ 94.2% a tiempo',
      pillColor: 'text-success bg-success-subtle',
      to: '/viajes',
    },
    {
      id: 'reservas',
      label: 'Mis Reservas',
      value: stats.reservas,
      unit: 'Cupos reservados',
      icon: 'bi-ticket-perforated-fill',
      iconColor: '#f59e0b',
      iconBg: '#fef3c7',
      pill: '● Historial al día',
      pillColor: 'text-warning bg-warning-subtle',
      to: '/reservas',
    },
    {
      id: 'calificaciones',
      label: 'Mi Calificación',
      value: stats.promedio !== null ? Number(stats.promedio).toFixed(1) : '5.0',
      unit: 'Puntaje de 5.0',
      icon: 'bi-star-fill',
      iconColor: '#10b981',
      iconBg: '#d1fae5',
      pill: '▲ 100% positivo',
      pillColor: 'text-success bg-success-subtle',
      to: '/calificaciones',
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      {/* ── Banner de Simulación si se presiona algún botón ── */}
      {simMessage && (
        <div className="alert alert-info border-0 shadow-sm rounded-4 d-flex align-items-center gap-3 py-3 px-4">
          <i className="bi bi-info-circle-fill fs-4 text-info" />
          <div className="fw-medium small">{simMessage}</div>
          <button
            type="button"
            className="btn-close ms-auto"
            onClick={() => setSimMessage('')}
            aria-label="Cerrar"
          />
        </div>
      )}

      {/* ── Encabezado de Inicio con Filtro de Período ── */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Inicio • Movilidad UCR</h1>
          <p className="text-secondary small mb-0">
            Plataforma oficial de transporte compartido UCR • Sede del Pacífico
          </p>
        </div>

        {/* Dropdown de período estilo Dribbble */}
        <div className="d-flex align-items-center gap-2">
          <div className="dropdown">
            <button
              className="btn btn-white bg-white border rounded-pill px-3 py-2 small shadow-sm d-flex align-items-center gap-2 text-secondary"
              type="button"
            >
              <i className="bi bi-calendar3 text-primary" />
              <span className="fw-medium text-dark">II Semestre 2026</span>
              <i className="bi bi-chevron-down ms-1" style={{ fontSize: '0.75rem' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Fila de 4 Tarjetas de Métricas (Inspiración Directa de la Imagen) ── */}
      <div className="row g-3 g-xl-4">
        {statCards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.id}>
            <div className="stat-card-white h-100 d-flex flex-column justify-content-between position-relative">
              {/* Icono de ayuda sutil en la esquina */}
              <div className="d-flex justify-content-between align-items-start mb-3">
                <i className="bi bi-question-circle text-secondary opacity-50" style={{ fontSize: '0.85rem' }} />
                {card.badgeUser && (
                  <span
                    className="badge rounded-circle p-1 bg-primary text-white shadow-sm"
                    style={{ width: 22, height: 22, fontSize: '0.65rem' }}
                    title="Vehículo verificado"
                  >
                    ✓
                  </span>
                )}
              </div>

              {/* Icono centrado en pastel */}
              <div className="d-flex justify-content-center mb-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: card.iconBg,
                    color: card.iconColor,
                  }}
                >
                  <i className={`bi ${card.icon} fs-4`} />
                </div>
              </div>

              {/* Valor Numérico Grande y Título */}
              <div className="text-center mb-3">
                <h2 className="display-6 fw-bolder text-dark mb-0" style={{ letterSpacing: '-0.03em' }}>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm text-secondary" />
                  ) : (
                    card.value
                  )}
                </h2>
                <span className="text-secondary small fw-medium">{card.label}</span>
              </div>

              {/* Micro-Pill / Trend en el pie de la tarjeta */}
              <div className="d-flex justify-content-center">
                <span className={`badge rounded-pill px-3 py-1 fw-semibold small ${card.pillColor}`}>
                  {card.pill}
                </span>
              </div>

              {/* Enlace sutil para navegar */}
              <Link to={card.to} className="stretched-link" aria-label={card.label} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Sección Inferior: 2 Paneles Grandes (Semi-Círculo y Gráfica/Acciones) ── */}
      <div className="row g-4">
        {/* Panel Izquierdo: Semi-Círculo de Capacidad / Ocupación (Similar a "Get More Likes" en la imagen) */}
        <div className="col-12 col-lg-5 col-xl-4">
          <div className="card-white p-4 h-100 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '1rem' }}>
                Capacidad & Ocupación
              </h5>
              <button
                className="btn btn-sm btn-light rounded-circle p-1"
                onClick={() => handleSimular('Ajustes de Ocupación')}
                title="Opciones"
              >
                <i className="bi bi-three-dots text-secondary" />
              </button>
            </div>

            {/* Gráfico SVG Semi-Circular estilizado */}
            <div className="d-flex flex-column align-items-center my-4 position-relative">
              <svg width="220" height="130" viewBox="0 0 220 130">
                {/* Arco de fondo gris */}
                <path
                  d="M 20 120 A 90 90 0 0 1 200 120"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                {/* Arco activo rojo/coral degradado como la imagen */}
                <path
                  d="M 20 120 A 90 90 0 0 1 170 50"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
              </svg>

              {/* Icono central de corazón o auto */}
              <div
                className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center shadow-sm position-absolute"
                style={{ width: 34, height: 34, top: 20 }}
              >
                <i className="bi bi-heart-fill fs-6" />
              </div>

              {/* Número central */}
              <div className="text-center mt-2">
                <h3 className="display-6 fw-bolder text-dark mb-0">82.5%</h3>
                <p className="text-secondary small mb-0">Cupos aprovechados este ciclo</p>
              </div>
            </div>

            {/* Simulación de Botones de Conductor */}
            <div className="d-flex flex-column gap-2 pt-3 border-top">
              <span className="text-secondary fw-semibold small" style={{ fontSize: '0.75rem' }}>
                ACCIONES RÁPIDAS DE CONDUCTOR:
              </span>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSimular('Abrir modal Nuevo Vehículo')}
                  className="btn btn-primary btn-sim-action flex-grow-1 shadow-sm"
                >
                  <i className="bi bi-plus-circle" />
                  + Registrar Vehículo
                </button>
                <button
                  type="button"
                  onClick={() => handleSimular('Abrir formulario Publicar Viaje')}
                  className="btn btn-light border btn-sim-action flex-grow-1 text-secondary"
                >
                  <i className="bi bi-send-plus" />
                  + Publicar Ride
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Flujo de Rutas por Sede y Tooltip Flotante (Similar a "Follower Growth") */}
        <div className="col-12 col-lg-7 col-xl-8">
          <div className="card-white p-4 h-100 d-flex flex-column justify-content-between position-relative">
            {/* Header con tabs */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-1" style={{ fontSize: '1rem' }}>
                  Demanda & Actividad de Sedes
                </h5>
                <p className="text-secondary small mb-0">
                  <span className="badge bg-primary-subtle text-primary me-2">● 14.8k km</span>
                  Compartidos entre recintos universitarios
                </p>
              </div>

              {/* Tabs selector */}
              <div className="d-flex gap-1 bg-light p-1 rounded-pill border">
                {['Todas', 'Pacífico', 'Rodrigo Facio', 'Occidente'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`btn btn-sm rounded-pill px-3 py-1 small fw-medium border-0 ${
                      activeTab === tab ? 'bg-white text-dark shadow-sm' : 'text-secondary'
                    }`}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulación de Barras de Actividad estilo la imagen con Tooltip Flotante */}
            <div className="position-relative py-4 my-2 px-3 bg-light rounded-4 border">
              {/* Tooltip flotante oscuro exactamente como el de la captura */}
              <div
                className="position-absolute shadow-lg rounded-3 p-3 text-white d-none d-md-block"
                style={{
                  top: '15px',
                  right: '25%',
                  backgroundColor: '#1e293b',
                  maxWidth: 240,
                  fontSize: '0.8rem',
                  lineHeight: 1.3,
                  zIndex: 10,
                }}
              >
                <div className="fw-semibold mb-1">Crecimiento +24.8% en Rides</div>
                <div className="text-secondary small" style={{ color: '#94a3b8' }}>
                  La Sede del Pacífico lidera las reservas entre Puntarenas y Esparza.
                </div>
              </div>

              {/* Barras de datos simuladas */}
              <div
                className="d-flex justify-content-between align-items-end"
                style={{ height: 160, paddingBottom: 10 }}
              >
                {[
                  { label: 'Lun', h1: '40%', h2: '75%', active: false },
                  { label: 'Mar', h1: '55%', h2: '85%', active: false },
                  { label: 'Mié', h1: '60%', h2: '90%', active: false },
                  { label: 'Jue', h1: '45%', h2: '65%', active: false },
                  { label: 'Vie', h1: '70%', h2: '100%', active: true },
                  { label: 'Sáb', h1: '30%', h2: '50%', active: false },
                ].map((col) => (
                  <div key={col.label} className="d-flex flex-column align-items-center gap-2">
                    <div className="d-flex align-items-end gap-1" style={{ height: 130 }}>
                      <div
                        className="rounded-pill bg-secondary-subtle"
                        style={{ width: 14, height: col.h1 }}
                      />
                      <div
                        className={`rounded-pill ${col.active ? 'bg-primary' : 'bg-primary-subtle'}`}
                        style={{ width: 14, height: col.h2 }}
                      />
                    </div>
                    <span className="small text-secondary fw-medium" style={{ fontSize: '0.75rem' }}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones de Simulación correspondientes a los 5 módulos */}
            <div className="pt-3 border-top">
              <p className="text-secondary fw-semibold small mb-2" style={{ fontSize: '0.75rem' }}>
                ACCESOS SIMULADOS A LOS MÓDULOS DEL PROYECTO:
              </p>
              <div className="d-flex gap-2 flex-wrap">
                <Link
                  to="/vehiculos"
                  className="btn btn-outline-primary btn-sim-action flex-grow-1"
                >
                  <i className="bi bi-truck-front-fill" />
                  Vehículos (Mi Módulo)
                </Link>
                <Link
                  to="/viajes"
                  className="btn btn-outline-success btn-sim-action flex-grow-1"
                >
                  <i className="bi bi-compass-fill" />
                  Viajes & Rutas
                </Link>
                <Link
                  to="/reservas"
                  className="btn btn-outline-warning btn-sim-action flex-grow-1"
                >
                  <i className="bi bi-ticket-perforated-fill" />
                  Reservas
                </Link>
                <Link
                  to="/calificaciones"
                  className="btn btn-outline-info btn-sim-action flex-grow-1"
                >
                  <i className="bi bi-star-fill" />
                  Calificaciones
                </Link>
                {(rol === 'admin' || rol === 'soporte') && (
                  <Link
                    to="/usuarios"
                    className="btn btn-outline-danger btn-sim-action flex-grow-1"
                  >
                    <i className="bi bi-shield-lock-fill" />
                    Gestión Usuarios
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
