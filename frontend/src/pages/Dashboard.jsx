import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, rol } = useAuth();
  const [stats, setStats] = useState({ vehiculos: 0, viajes: 0, reservas: 0, promedio: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
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

        let promedio = null;
        if (user?.id) {
          try {
            const { data } = await api.get(`/calificaciones/promedio/${user.id}/`);
            promedio = data.promedio;
          } catch { /* sin calificaciones aún */ }
        }

        setStats({
          vehiculos: contarResultados(veh),
          viajes: contarResultados(via),
          reservas: contarResultados(res),
          promedio,
        });
      } catch { /* silenciar */ }
      setLoading(false);
    };
    cargar();
  }, [user?.id]);

  const cards = [
    { icon: 'bi-truck',          color: 'primary',  label: 'Mis Vehículos',     value: stats.vehiculos, to: '/vehiculos' },
    { icon: 'bi-map',            color: 'success',  label: 'Viajes Disponibles', value: stats.viajes,   to: '/viajes' },
    { icon: 'bi-bookmark-check', color: 'info',     label: 'Mis Reservas',       value: stats.reservas, to: '/reservas' },
    { icon: 'bi-star-fill',      color: 'warning',  label: 'Mi Calificación',    value: stats.promedio !== null ? Number(stats.promedio).toFixed(1) : '—', to: '/calificaciones' },
  ];

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Dashboard</h1>
          <p className="text-secondary mb-0">
            Bienvenido, {user?.first_name || user?.username || 'Estudiante'}
            <span className="badge bg-secondary ms-2 text-uppercase">{rol}</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-secondary">Cargando indicadores…</p>
        </div>
      ) : (
        <div className="row g-4">
          {cards.map((c) => (
            <div className="col-sm-6 col-lg-3" key={c.label}>
              <Link to={c.to} className="text-decoration-none">
                <div className={`card border-0 shadow-sm border-start border-4 border-${c.color} h-100`}>
                  <div className="card-body d-flex align-items-center gap-3 p-4">
                    <div className={`bg-${c.color} bg-opacity-10 rounded-3 p-3`}>
                      <i className={`bi ${c.icon} text-${c.color} fs-3`} />
                    </div>
                    <div>
                      <p className="text-secondary small mb-1">{c.label}</p>
                      <h3 className="fw-bold mb-0">{c.value}</h3>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-3"><i className="bi bi-lightning-fill text-warning me-2" />Accesos rápidos</h5>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/viajes" className="btn btn-outline-success btn-sm">
              <i className="bi bi-plus-lg me-1" />Buscar viaje
            </Link>
            <Link to="/vehiculos" className="btn btn-outline-primary btn-sm">
              <i className="bi bi-plus-lg me-1" />Registrar vehículo
            </Link>
            <Link to="/perfil" className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-person-gear me-1" />Mi perfil
            </Link>
            {(rol === 'admin' || rol === 'soporte') && (
              <Link to="/usuarios" className="btn btn-outline-danger btn-sm">
                <i className="bi bi-people me-1" />Gestionar usuarios
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
