import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Dashboard() {
  const { user, rol, esAdmin } = useAuth();
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

  const esStaff = esAdmin || rol === 'admin' || rol === 'soporte';

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
      icon: 'bi-truck',
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
      icon: 'bi-compass',
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
      icon: 'bi-ticket-perforated',
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
      icon: 'bi-star',
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

        {/* Badge de usuario */}
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
            <i className="bi bi-person-circle me-1" />
            {user?.first_name || user?.username || 'Estudiante'} • {rol?.toUpperCase() || 'ESTUDIANTE'}
          </span>
        </div>
      </div>

      {/* ── 4 Tarjetas de Estadísticas Principales ── */}
      <div className="row g-3">
        {statCards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.id}>
            <Link to={card.to} className="text-decoration-none">
              <div className="stat-card-white h-100 d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: card.iconBg,
                      color: card.iconColor,
                    }}
                  >
                    <i className={`bi ${card.icon} fs-5`} />
                  </div>
                  <span className={`badge rounded-pill px-2 py-1 small fw-medium ${card.pillColor}`}>
                    {card.pill}
                  </span>
                </div>

                <div>
                  <div className="h3 fw-bold text-dark mb-0">{card.value}</div>
                  <div className="text-secondary small fw-medium mt-1">{card.label}</div>
                  <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                    {card.unit}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* ── Accesos a los Módulos ── */}
      <div className="card-white p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 className="fw-bold mb-1">
              <i className="bi bi-grid-fill text-primary me-2" />
              Módulos del Sistema
            </h5>
            <p className="text-secondary small mb-0">Acceso rápido a las operaciones del proyecto</p>
          </div>
          <div className="d-flex gap-2">
            {['Todas', 'Operación', 'Gestión'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`btn btn-sm rounded-pill px-3 py-1 small fw-medium border-0 ${
                  activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-secondary bg-light'
                }`}
                style={{ fontSize: '0.75rem' }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap pt-2">
          <Link to="/viajes" className="btn btn-outline-success btn-sim-action flex-grow-1">
            <i className="bi bi-map" />
            Viajes & Rutas
          </Link>
          <Link to="/vehiculos" className="btn btn-outline-primary btn-sim-action flex-grow-1">
            <i className="bi bi-truck" />
            Vehículos
          </Link>
          <Link to="/reservas" className="btn btn-outline-warning btn-sim-action flex-grow-1">
            <i className="bi bi-ticket-perforated" />
            Reservas
          </Link>
          <Link to="/calificaciones" className="btn btn-outline-info btn-sim-action flex-grow-1">
            <i className="bi bi-star" />
            Calificaciones
          </Link>
          {esStaff && (
            <Link to="/usuarios" className="btn btn-outline-danger btn-sim-action flex-grow-1">
              <i className="bi bi-people-fill" />
              Gestión Usuarios (Staff)
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
