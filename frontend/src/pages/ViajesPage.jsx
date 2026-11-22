import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listAllViajes, listAllMisReservas } from '../services/reservaService.js';

/* ── Sedes oficiales del sistema RaidU (Viaje.Sede) ── */
const SEDES = [
  { value: 'rodrigo_facio', label: 'Sede Rodrigo Facio Brenes (San José)' },
  { value: 'san_ramon',     label: 'Sede de Occidente (San Ramón)' },
  { value: 'esparza',       label: 'Recinto de Esparza' },
  { value: 'puntarenas',    label: 'Sede del Pacífico (Puntarenas)' },
];

/* ── Estados de viaje ── */
const ESTADOS = [
  { value: 'publicado',  label: 'Publicado',  color: 'success' },
  { value: 'lleno',      label: 'Lleno',      color: 'warning text-dark' },
  { value: 'en_curso',   label: 'En curso',   color: 'info text-dark' },
  { value: 'finalizado', label: 'Finalizado', color: 'secondary' },
  { value: 'cancelado',  label: 'Cancelado',  color: 'danger' },
];

const sedeLabel = (val) => SEDES.find((s) => s.value === val)?.label || val;

export const esPasado = (v) => Boolean(v?.fecha_hora && new Date(v.fecha_hora) <= new Date());

export const getEstadoEfectivo = (v) => {
  if (!v) return 'publicado';
  if (typeof v === 'string') return v;
  return v.estado;
};

const estadoBadge = (val) => {
  const estado = typeof val === 'string' ? val : getEstadoEfectivo(val);
  return ESTADOS.find((e) => e.value === estado) || { label: estado, color: 'secondary' };
};

const FORM_VACIO = {
  nombre: '',
  vehiculo: '',
  sede_origen: '',
  sede_destino: '',
  lugar_origen: '',
  lugar_destino: '',
  fecha_hora: '',
  cupos_totales: 1,
  costo_total: '',
};

export default function ViajesPage() {
  const { user, esAdmin, esSoporte } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── estado listado ── */
  const [viajes, setViajes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  /* ── filtros combinables ── */
  const [filtros, setFiltros] = useState({
    sede_origen: '',
    sede_destino: '',
    estado: '',
    fecha: '',
    ordering: 'fecha_hora',
  });
  const [showFiltros, setShowFiltros] = useState(false);

  /* ── vehículos del usuario ── */
  const [misVehiculos, setMisVehiculos] = useState([]);
  const [loadingVeh, setLoadingVeh] = useState(true);
  const [tieneVehiculos, setTieneVehiculos] = useState(false);
  const [misReservasViajesIds, setMisReservasViajesIds] = useState(new Set());

  /* ── formulario ── */
  const [form, setForm] = useState({ ...FORM_VACIO });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [maxCupos, setMaxCupos] = useState(5);

  /* ── tarjeta expandida ── */
  const [detalleId, setDetalleId] = useState(null);

  /* ═══ 1. Consultar vehículos del usuario para validar perfil de conductor ═══ */
  const cargarVehiculos = useCallback(async () => {
    setLoadingVeh(true);
    try {
      const { data } = await api.get('/vehiculos/?page=1');
      const paginas = await Promise.all(Array.from({ length: Math.max(0, (data.total_pages || 1) - 1) }, (_, i) => api.get(`/vehiculos/?page=${i + 2}`)));
      const lista = [...(data.results || []), ...paginas.flatMap((pagina) => pagina.data.results || [])];
      // Filtrar vehículos activos pertenecientes al usuario actual
      const propios = lista.filter(
        (v) => v.activo !== false && (user?.id ? Number(v.propietario) === Number(user?.id) : true)
      );
      setMisVehiculos(propios);
      setTieneVehiculos(propios.length > 0);
    } catch (err) {
      setMisVehiculos([]);
      setTieneVehiculos(false);
      setError(`No se pudieron cargar los vehículos: ${getError(err)}`);
    } finally {
      setLoadingVeh(false);
    }
  }, [user?.id]);

  /* ═══ 2. Cargar viajes: Admin ve todos; usuario regular solo los relacionales a su perfil ═══ */
  const cargarViajes = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError('');
      try {
        if (esAdmin) {
          // Administrador: consulta y pagina todos los viajes del sistema
          const params = new URLSearchParams({ page: p });
          Object.entries(filtros).forEach(([k, v]) => {
            if (v) params.set(k, v);
          });
          const { data } = await api.get(`/viajes/?${params}`);
          setViajes(data.resultados || []);
          setPage(data.pagina_actual || p);
          setTotalPages(data.total_paginas || 1);
          setTotalCount(data.total_registros || 0);
        } else {
          // Estudiante / Conductor: solo viajes relacionales a su perfil
          // (Viajes que conduce + Viajes donde tiene reserva)
          const [todos, itemsReservas] = await Promise.all([
            listAllViajes(),
            listAllMisReservas(user?.id),
          ]);
          const idsReservados = new Set(
            itemsReservas
              .filter((r) => r.estado === 'confirmada')
              .map((r) => Number(r.viaje))
          );
          setMisReservasViajesIds(idsReservados);

          let relacionales = todos.filter((v) => {
            const soyConductor = user?.id && Number(v.conductor) === Number(user.id);
            const soyPasajero = idsReservados.has(Number(v.id));
            return soyConductor || soyPasajero;
          });

          // Filtros de sede, estado o fecha
          if (filtros.sede_origen) {
            relacionales = relacionales.filter((v) => v.sede_origen === filtros.sede_origen);
          }
          if (filtros.sede_destino) {
            relacionales = relacionales.filter((v) => v.sede_destino === filtros.sede_destino);
          }
          if (filtros.estado) {
            relacionales = relacionales.filter((v) => getEstadoEfectivo(v) === filtros.estado);
          }
          if (filtros.fecha) {
            relacionales = relacionales.filter((v) => v.fecha_hora?.startsWith(filtros.fecha));
          }

          const descendente = filtros.ordering.startsWith('-');
          const campo = filtros.ordering.replace(/^-/, '');
          relacionales.sort((a, b) => {
            const diferencia = campo === 'costo_total'
              ? Number(a.costo_total) - Number(b.costo_total)
              : new Date(a.fecha_hora) - new Date(b.fecha_hora);
            return (descendente ? -diferencia : diferencia) || a.id - b.id;
          });

          setViajes(relacionales);
          setPage(1);
          setTotalPages(1);
          setTotalCount(relacionales.length);
        }
      } catch (err) {
        setError(getError(err));
      } finally {
        setLoading(false);
      }
    },
    [filtros, esAdmin, user?.id]
  );

  const cargarMisReservas = useCallback(async () => {
    try {
      const items = await listAllMisReservas(user?.id);
      const ids = new Set(
        items
          .filter((r) => r.estado === 'confirmada')
          .map((r) => Number(r.viaje))
      );
      setMisReservasViajesIds(ids);
    } catch (err) {
      setMisReservasViajesIds(new Set());
      setError(`No se pudieron cargar tus reservas: ${getError(err)}`);
    }
  }, [user?.id]);

  const esParticipante = useCallback(
    (viaje) => {
      if (!user?.id || !viaje) return false;
      const esConductor = Number(viaje.conductor) === Number(user.id);
      const esPasajero = misReservasViajesIds.has(Number(viaje.id));
      return esConductor || esPasajero;
    },
    [user?.id, misReservasViajesIds]
  );

  useEffect(() => {
    cargarVehiculos();
    cargarMisReservas();
  }, [cargarVehiculos, cargarMisReservas]);

  useEffect(() => {
    cargarViajes();
  }, [cargarViajes]);

  /* ═══ 3. Manejo de formulario y validación dinámica de asientos ═══ */
  const change = (e) => {
    const { name, value } = e.target;
    const nuevoValor = name === 'cupos_totales' ? (value === '' ? '' : Number(value)) : value;

    setForm((prev) => ({
      ...prev,
      [name]: nuevoValor,
    }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));

    // Al seleccionar vehículo, ajustar dinámicamente el límite máximo de asientos (capacidad)
    if (name === 'vehiculo') {
      const vehSeleccionado = misVehiculos.find((v) => v.id === Number(value));
      if (vehSeleccionado) {
        const cap = vehSeleccionado.capacidad;
        setMaxCupos(cap);
        setForm((prev) => ({
          ...prev,
          vehiculo: value,
          cupos_totales: prev.cupos_totales > cap ? cap : (prev.cupos_totales || 1),
        }));
      } else {
        setMaxCupos(5);
      }
    }
  };

  const changeFiltro = (e) => {
    setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      sede_origen: '',
      sede_destino: '',
      estado: '',
      fecha: '',
      ordering: 'fecha_hora',
    });
  };

  const abrirCrear = () => {
    if (esSoporte || !tieneVehiculos) return;
    const primerVehiculo = misVehiculos[0];
    const cap = primerVehiculo ? primerVehiculo.capacidad : 5;
    setMaxCupos(cap);
    setForm({
      ...FORM_VACIO,
      vehiculo: primerVehiculo ? String(primerVehiculo.id) : '',
      cupos_totales: 1,
    });
    setEditId(null);
    setShowForm(true);
    setFormErrors({});
  };

  useEffect(() => {
    if (loadingVeh || searchParams.get('nuevo') !== 'true') return;
    const solicitado = misVehiculos.find((v) => String(v.id) === searchParams.get('vehiculo'));
    if (!esSoporte && misVehiculos.length > 0) {
      const elegido = solicitado || misVehiculos[0];
      setMaxCupos(elegido.capacidad);
      setForm({ ...FORM_VACIO, vehiculo: String(elegido.id), cupos_totales: 1 });
      setEditId(null);
      setFormErrors({});
      setShowForm(true);
    }
    setSearchParams({}, { replace: true });
  }, [loadingVeh, misVehiculos, esSoporte, searchParams, setSearchParams]);

  const abrirEditar = (v) => {
    const veh = misVehiculos.find((x) => x.id === v.vehiculo);
    const cap = veh ? veh.capacidad : v.cupos_totales || 5;
    setMaxCupos(cap);
    setForm({
      nombre: v.nombre || '',
      vehiculo: String(v.vehiculo),
      sede_origen: v.sede_origen,
      sede_destino: v.sede_destino,
      lugar_origen: v.lugar_origen || '',
      lugar_destino: v.lugar_destino || '',
      fecha_hora: v.fecha_hora ? v.fecha_hora.slice(0, 16) : '',
      cupos_totales: v.cupos_totales,
      costo_total: v.costo_total,
    });
    setEditId(v.id);
    setShowForm(true);
    setFormErrors({});
  };

  const cancelarForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormErrors({});
  };

  /* ═══ Validación frontend estricta según reglas de negocio ═══ */
  const validar = () => {
    const errs = {};
    if (!form.vehiculo) {
      errs.vehiculo = 'Debe seleccionar un vehículo registrado.';
    }

    if (!form.sede_origen) {
      errs.sede_origen = 'Seleccione la sede de origen.';
    }

    if (!form.sede_destino) {
      errs.sede_destino = 'Seleccione la sede de destino.';
    } else if (form.sede_origen && form.sede_destino === form.sede_origen) {
      errs.sede_destino = 'La sede de destino no puede ser igual a la de origen.';
    }

    if (!form.fecha_hora) {
      errs.fecha_hora = 'Indique la fecha y hora de salida.';
    } else {
      const fechaViaje = new Date(form.fecha_hora);
      if (fechaViaje <= new Date()) {
        errs.fecha_hora = 'La fecha y hora del viaje debe ser posterior a la actual.';
      }
    }

    if (!form.cupos_totales || form.cupos_totales < 1) {
      errs.cupos_totales = 'Debe ofrecer al menos 1 cupo.';
    } else if (form.cupos_totales > maxCupos) {
      errs.cupos_totales = `El vehículo seleccionado solo tiene capacidad para ${maxCupos} pasajeros.`;
    }

    if (!form.costo_total || Number(form.costo_total) <= 0) {
      errs.costo_total = 'El costo total debe ser mayor que ₡0.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ═══ Guardar viaje (crear o editar) ═══ */
  const guardar = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setSaving(true);
    setError('');
    setMsg('');
    try {
      const payload = {
        nombre: form.nombre.trim(),
        vehiculo: Number(form.vehiculo),
        sede_origen: form.sede_origen,
        sede_destino: form.sede_destino,
        lugar_origen: (form.lugar_origen || '').trim(),
        lugar_destino: (form.lugar_destino || '').trim(),
        fecha_hora: new Date(form.fecha_hora).toISOString(),
        cupos_totales: Number(form.cupos_totales),
        costo_total: Number(form.costo_total).toFixed(2),
      };

      if (editId) {
        await api.patch(`/viajes/${editId}/`, payload);
        setMsg('Viaje actualizado correctamente.');
      } else {
        await api.post('/viajes/', payload);
        setMsg('Viaje publicado con éxito. Ahora otros estudiantes pueden reservar.');
      }
      cancelarForm();
      cargarViajes(editId ? page : 1);
    } catch (err) {
      if (err.response?.status === 400 && typeof err.response.data === 'object') {
        const fieldErrs = {};
        Object.entries(err.response.data).forEach(([k, v]) => {
          fieldErrs[k] = Array.isArray(v) ? v.join(' ') : v;
        });
        setFormErrors(fieldErrs);
        if (fieldErrs.detail) setError(fieldErrs.detail);
      } else {
        setError(getError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  /* ═══ Eliminar viaje ═══ */
  const eliminarViaje = async (v) => {
    if (!window.confirm(`¿Está seguro de eliminar el viaje #${v.id}? Si ya tiene reservas asociadas, deberá cancelarlo en su lugar.`)) {
      return;
    }
    setMsg('');
    setError('');
    try {
      await api.delete(`/viajes/${v.id}/`);
      setMsg(`Viaje #${v.id} eliminado correctamente.`);
      cargarViajes(page);
    } catch (err) {
      setError(getError(err));
    }
  };

  /* ═══ Transición de estado ═══ */
  const cambiarEstado = async (viaje, nuevoEstado) => {
    const accionLabels = {
      en_curso: 'iniciar',
      finalizado: 'marcar como finalizado',
      cancelado: 'cancelar',
    };
    if (!window.confirm(`¿Desea ${accionLabels[nuevoEstado] || nuevoEstado} este viaje?`)) {
      return;
    }
    setMsg('');
    setError('');
    try {
      await api.patch(`/viajes/${viaje.id}/`, { estado: nuevoEstado });
      setMsg(`Estado del viaje #${viaje.id} actualizado a "${nuevoEstado}".`);
      cargarViajes(page);
    } catch (err) {
      setError(getError(err));
    }
  };

  const esConductor = (v) => user?.id && Number(v.conductor) === Number(user?.id);
  const puedeModificar = (v) =>
    !esSoporte && (esConductor(v) || esAdmin) &&
    ['publicado', 'lleno'].includes(v.estado) &&
    !esPasado(v);

  return (
    <>
      {/* ── Encabezado ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">
            <i className="bi bi-map me-2 text-success" />
            {esAdmin ? 'Catálogo General de Viajes (Admin)' : 'Mis Viajes'}
          </h1>
          <p className="text-secondary small mb-0">
            {esAdmin
              ? 'Control y catálogo de todos los viajes universitarios registrados en el sistema.'
              : 'Viajes relacionados con tu perfil institucional (conducidos por ti o donde tienes reserva).'}
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className={`btn btn-outline-secondary btn-sm ${showFiltros ? 'active' : ''}`}
            onClick={() => setShowFiltros(!showFiltros)}
          >
            <i className="bi bi-funnel me-1" />
            {showFiltros ? 'Ocultar filtros' : 'Filtros'}
          </button>
          {!esSoporte && !showForm && (
            <button
              className="btn btn-success shadow-sm"
              onClick={abrirCrear}
              disabled={loadingVeh || !tieneVehiculos}
              title={!tieneVehiculos ? 'Requiere registrar un vehículo antes' : 'Publicar nuevo viaje'}
            >
              <i className="bi bi-plus-lg me-1" />Publicar viaje
            </button>
          )}
        </div>
      </div>

      {/* ── Alertas ── */}
      {msg && (
        <div className="alert alert-success alert-dismissible fade show py-2 d-flex align-items-center" role="alert">
          <i className="bi bi-check-circle-fill me-2 fs-5" />
          <div className="flex-grow-1">{msg}</div>
          <button type="button" className="btn-close" onClick={() => setMsg('')} aria-label="Cerrar" />
        </div>
      )}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show py-2 d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-5" />
          <div className="flex-grow-1">{error}</div>
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Cerrar" />
        </div>
      )}

      {/* ── Aviso cuando el usuario no tiene vehículos registrados (RF2 requerimiento) ── */}
      {!esSoporte && !loadingVeh && !tieneVehiculos && (
        <div className="card border-0 shadow-sm border-start border-4 border-warning mb-4">
          <div className="card-body p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-warning bg-opacity-10 rounded-circle p-2 text-warning">
                <i className="bi bi-exclamation-circle-fill fs-4" />
              </div>
              <div>
                <h6 className="fw-bold mb-0">¿Desea ofrecer un viaje como conductor?</h6>
                <p className="text-muted small mb-0">
                  Para publicar un viaje debe tener al menos un vehículo registrado y activo en su perfil.
                </p>
              </div>
            </div>
            <Link to="/vehiculos" className="btn btn-warning btn-sm fw-semibold">
              <i className="bi bi-truck me-1" />Registrar mi vehículo
            </Link>
          </div>
        </div>
      )}

      {/* ── Filtros combinables (RF2-08) ── */}
      {showFiltros && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-2 border-bottom">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold small text-secondary">
                <i className="bi bi-sliders me-1" />Filtros avanzados de búsqueda
              </span>
              <button className="btn btn-link btn-sm text-decoration-none p-0 text-muted" onClick={limpiarFiltros}>
                Restablecer todos
              </button>
            </div>
          </div>
          <div className="card-body p-3">
            <div className="row g-2">
              <div className="col-12 col-sm-6 col-lg-3">
                <label className="form-label small fw-semibold text-muted mb-1">Sede Origen</label>
                <select
                  className="form-select form-select-sm"
                  name="sede_origen"
                  value={filtros.sede_origen}
                  onChange={changeFiltro}
                >
                  <option value="">Todas las sedes</option>
                  {SEDES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <label className="form-label small fw-semibold text-muted mb-1">Sede Destino</label>
                <select
                  className="form-select form-select-sm"
                  name="sede_destino"
                  value={filtros.sede_destino}
                  onChange={changeFiltro}
                >
                  <option value="">Todas las sedes</option>
                  {SEDES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-lg-2">
                <label className="form-label small fw-semibold text-muted mb-1">Estado</label>
                <select
                  className="form-select form-select-sm"
                  name="estado"
                  value={filtros.estado}
                  onChange={changeFiltro}
                >
                  <option value="">Todos los estados</option>
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-lg-2">
                <label className="form-label small fw-semibold text-muted mb-1">Fecha de salida</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  name="fecha"
                  value={filtros.fecha}
                  onChange={changeFiltro}
                />
              </div>

              <div className="col-12 col-sm-6 col-lg-2">
                <label className="form-label small fw-semibold text-muted mb-1">Ordenar por</label>
                <select
                  className="form-select form-select-sm"
                  name="ordering"
                  value={filtros.ordering}
                  onChange={changeFiltro}
                >
                  <option value="fecha_hora">Fecha (próximos primero)</option>
                  <option value="-fecha_hora">Fecha (más lejanos)</option>
                  <option value="costo_total">Costo (menor a mayor)</option>
                  <option value="-costo_total">Costo (mayor a menor)</option>
                </select>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
              <button className="btn btn-outline-secondary btn-sm" onClick={limpiarFiltros}>
                Limpiar
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => cargarViajes(1)}>
                <i className="bi bi-search me-1" />Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Formulario de creación / edición de viaje ── */}
      {showForm && (
        <div className="card border-0 shadow-sm mb-4 border-top border-4 border-success">
          <div className="card-header bg-white py-3 border-bottom">
            <h5 className="fw-bold mb-0 text-success">
              <i className={`bi ${editId ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`} />
              {editId ? 'Modificar datos del viaje' : 'Publicar un nuevo viaje'}
            </h5>
          </div>
          <div className="card-body p-4">
            <form onSubmit={guardar}>
              <div className="row g-3">
                <div className="col-12">
                  <label htmlFor="nombre" className="form-label fw-semibold">Nombre del viaje (opcional)</label>
                  <input id="nombre" name="nombre" className="form-control" maxLength={100} value={form.nombre} onChange={change} disabled={saving} placeholder="Ej: Viaje a la U por la mañana" />
                  <div className="form-text">Ayuda a reconocer este viaje en las reservas y calificaciones.</div>
                </div>
                {/* Selector de vehículo */}
                <div className="col-md-6 col-lg-4">
                  <label htmlFor="vehiculo" className="form-label fw-semibold">
                    Vehículo a utilizar <span className="text-danger">*</span>
                  </label>
                  <select
                    id="vehiculo"
                    name="vehiculo"
                    className={`form-select ${formErrors.vehiculo ? 'is-invalid' : ''}`}
                    value={form.vehiculo}
                    onChange={change}
                    disabled={saving}
                  >
                    <option value="">— Seleccione su vehículo —</option>
                    {misVehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.placa} — {v.marca} {v.modelo} (Capacidad: {v.capacidad} pasajeros)
                      </option>
                    ))}
                  </select>
                  {formErrors.vehiculo && <div className="invalid-feedback">{formErrors.vehiculo}</div>}
                  <div className="form-text">Solo puede publicar con sus propios vehículos registrados.</div>
                </div>

                {/* Cupos totales con validación dinámica */}
                <div className="col-md-6 col-lg-4">
                  <label htmlFor="cupos_totales" className="form-label fw-semibold">
                    Asientos disponibles para pasajeros <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-people-fill text-muted" />
                    </span>
                    <input
                      id="cupos_totales"
                      name="cupos_totales"
                      type="number"
                      min={1}
                      max={maxCupos}
                      className={`form-control ${formErrors.cupos_totales ? 'is-invalid' : ''}`}
                      value={form.cupos_totales}
                      onChange={change}
                      disabled={saving}
                    />
                    <span className="input-group-text bg-light text-muted small">
                      máx. {maxCupos}
                    </span>
                    {formErrors.cupos_totales && (
                      <div className="invalid-feedback">{formErrors.cupos_totales}</div>
                    )}
                  </div>
                  <div className="form-text">
                    Límite ajustado automáticamente a la capacidad del vehículo ({maxCupos} máx).
                  </div>
                </div>

                {/* Costo total */}
                <div className="col-md-6 col-lg-4">
                  <label htmlFor="costo_total" className="form-label fw-semibold">
                    Costo total del viaje (₡ CRC) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">₡</span>
                    <input
                      id="costo_total"
                      name="costo_total"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={`form-control ${formErrors.costo_total ? 'is-invalid' : ''}`}
                      value={form.costo_total}
                      onChange={change}
                      placeholder="Ej: 2500"
                      disabled={saving}
                    />
                    {formErrors.costo_total && (
                      <div className="invalid-feedback">{formErrors.costo_total}</div>
                    )}
                  </div>
                  <div className="form-text">Monto total a compartir entre los pasajeros.</div>
                </div>

                {/* Sede origen */}
                <div className="col-md-6">
                  <label htmlFor="sede_origen" className="form-label fw-semibold">
                    Sede de origen <span className="text-danger">*</span>
                  </label>
                  <select
                    id="sede_origen"
                    name="sede_origen"
                    className={`form-select ${formErrors.sede_origen ? 'is-invalid' : ''}`}
                    value={form.sede_origen}
                    onChange={change}
                    disabled={saving}
                  >
                    <option value="">— Seleccione sede de salida —</option>
                    {SEDES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {formErrors.sede_origen && (
                    <div className="invalid-feedback">{formErrors.sede_origen}</div>
                  )}
                </div>

                {/* Sede destino */}
                <div className="col-md-6">
                  <label htmlFor="sede_destino" className="form-label fw-semibold">
                    Sede de destino <span className="text-danger">*</span>
                  </label>
                  <select
                    id="sede_destino"
                    name="sede_destino"
                    className={`form-select ${formErrors.sede_destino ? 'is-invalid' : ''}`}
                    value={form.sede_destino}
                    onChange={change}
                    disabled={saving}
                  >
                    <option value="">— Seleccione sede de llegada —</option>
                    {SEDES.filter((s) => s.value !== form.sede_origen).map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {formErrors.sede_destino && (
                    <div className="invalid-feedback">{formErrors.sede_destino}</div>
                  )}
                </div>

                {/* Punto de encuentro origen (opcional) */}
                <div className="col-md-6">
                  <label htmlFor="lugar_origen" className="form-label fw-semibold">
                    Punto de encuentro específico <span className="text-muted small">(opcional)</span>
                  </label>
                  <input
                    id="lugar_origen"
                    name="lugar_origen"
                    className="form-control"
                    value={form.lugar_origen}
                    onChange={change}
                    maxLength={150}
                    placeholder="Ej: Frente al pretil / Portón principal"
                    disabled={saving}
                  />
                </div>

                {/* Punto de llegada destino (opcional) */}
                <div className="col-md-6">
                  <label htmlFor="lugar_destino" className="form-label fw-semibold">
                    Punto de llegada específico <span className="text-muted small">(opcional)</span>
                  </label>
                  <input
                    id="lugar_destino"
                    name="lugar_destino"
                    className="form-control"
                    value={form.lugar_destino}
                    onChange={change}
                    maxLength={150}
                    placeholder="Ej: Parqueo sur / Entrada de aulas"
                    disabled={saving}
                  />
                </div>

                {/* Fecha y hora */}
                <div className="col-md-6">
                  <label htmlFor="fecha_hora" className="form-label fw-semibold">
                    Fecha y hora de salida <span className="text-danger">*</span>
                  </label>
                  <input
                    id="fecha_hora"
                    name="fecha_hora"
                    type="datetime-local"
                    className={`form-control ${formErrors.fecha_hora ? 'is-invalid' : ''}`}
                    value={form.fecha_hora}
                    onChange={change}
                    disabled={saving}
                  />
                  {formErrors.fecha_hora && (
                    <div className="invalid-feedback">{formErrors.fecha_hora}</div>
                  )}
                  <div className="form-text">Debe ser una fecha y hora futura.</div>
                </div>
              </div>

              {formErrors.non_field_errors && (
                <div className="alert alert-danger mt-3 py-2">{formErrors.non_field_errors}</div>
              )}

              <div className="d-flex gap-2 mt-4 pt-2 border-top">
                <button type="submit" className="btn btn-success" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Guardando viaje...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1" />
                      {editId ? 'Guardar cambios' : 'Publicar viaje'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={cancelarForm}
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Listado de viajes disponibles ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status" />
          <p className="mt-2 text-secondary">Cargando viajes disponibles…</p>
        </div>
      ) : viajes.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
              <i className="bi bi-map text-secondary fs-1" />
            </div>
            <h5 className="fw-semibold text-secondary">
              {esAdmin ? 'No se encontraron viajes' : 'No tienes viajes relacionados a tu perfil'}
            </h5>
            <p className="text-muted small mb-3">
              {Object.values(filtros).some(Boolean)
                ? 'No hay viajes que coincidan con los filtros seleccionados.'
                : esAdmin
                  ? 'Aún no se han publicado viajes en el sistema.'
                  : 'Aquí aparecerán los viajes que publiques como conductor o en los que reserves un cupo como pasajero.'}
            </p>
            {Object.values(filtros).some(Boolean) && (
              <button className="btn btn-outline-primary btn-sm" onClick={limpiarFiltros}>
                Restablecer filtros
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3 px-1">
            <span className="text-secondary small">
              Se encontraron <strong>{totalCount}</strong> viaje{totalCount !== 1 ? 's' : ''}
            </span>
            <span className="badge bg-light text-secondary border">
              Página {page} de {totalPages}
            </span>
          </div>

          {/* Cards responsivas de viajes */}
          <div className="row g-3">
            {viajes.map((v) => {
              const est = estadoBadge(v);
              const pasado = esPasado(v);
              const efectivo = getEstadoEfectivo(v);
              const expandido = detalleId === v.id;
              const mio = esConductor(v);

              return (
                <div className="col-12 col-lg-6" key={v.id}>
                  <div
                    className={`card border-0 shadow-sm h-100 ${
                      mio ? 'border-start border-4 border-success' : ''
                    }`}
                  >
                    <div className="card-body p-3 d-flex flex-column justify-content-between">
                      {/* Cabecera de la tarjeta */}
                      <div>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className={`badge bg-${est.color}`}>{est.label}</span>
                            {pasado && !['cancelado', 'finalizado'].includes(v.estado) && (
                              <span
                                className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25"
                                title="La fecha y hora de este viaje ya transcurrieron"
                              >
                                <i className="bi bi-clock-history me-1" />Hora de salida transcurrida
                              </span>
                            )}
                            {mio ? (
                              <span className="badge bg-success bg-opacity-10 text-success">
                                <i className="bi bi-person-check-fill me-1" />Conductor (Mi viaje)
                              </span>
                            ) : misReservasViajesIds.has(Number(v.id)) ? (
                              <span className="badge bg-primary bg-opacity-10 text-primary">
                                <i className="bi bi-bookmark-check-fill me-1" />Pasajero (Mi reserva)
                              </span>
                            ) : null}
                            <span className="text-muted small">#{v.id}</span>
                          </div>

                          <span className="fw-bold text-success fs-5">
                            ₡{Number(v.costo_total).toLocaleString('es-CR')}
                          </span>
                        </div>

                        <h3 className="h6 fw-bold">{v.nombre || `${sedeLabel(v.sede_origen)} → ${sedeLabel(v.sede_destino)}`}</h3>
                        {/* Ruta: Origen -> Destino */}
                        <div className="mb-3">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <i className="bi bi-geo-alt-fill text-danger fs-6" />
                            <span className="fw-semibold text-dark">{sedeLabel(v.sede_origen)}</span>
                          </div>
                          <div className="ms-3 ps-2 border-start border-2 text-muted small py-1">
                            {v.lugar_origen ? (
                              <span>Punto: {v.lugar_origen}</span>
                            ) : (
                              <span className="text-muted fst-italic">Sin punto específico</span>
                            )}
                          </div>
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <i className="bi bi-geo-fill text-success fs-6" />
                            <span className="fw-semibold text-dark">{sedeLabel(v.sede_destino)}</span>
                          </div>
                          {v.lugar_destino && (
                            <div className="ms-3 ps-2 text-muted small">
                              Punto: {v.lugar_destino}
                            </div>
                          )}
                        </div>

                        {/* Métricas clave */}
                        <div className="row g-2 p-2 bg-light rounded-3 small text-secondary mb-2">
                          <div className="col-6">
                            <i className="bi bi-calendar3 me-1 text-primary" />
                            {v.fecha_hora
                              ? new Date(v.fecha_hora).toLocaleString('es-CR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : '—'}
                          </div>
                          <div className="col-6 text-end">
                            <i className="bi bi-people-fill me-1 text-primary" />
                            {efectivo === 'finalizado' || efectivo === 'cancelado' ? (
                              <span className="badge bg-secondary bg-opacity-25 text-dark fw-normal">
                                {efectivo === 'cancelado' ? 'Viaje cancelado' : 'Viaje finalizado'}
                              </span>
                            ) : (
                              <>
                                <strong className="text-dark">{v.cupos_disponibles}</strong> / {v.cupos_totales} cupos
                              </>
                            )}
                          </div>
                        </div>

                        {/* Detalle expandido */}
                        {expandido && (
                          <div className="p-3 bg-white rounded border mt-2 small">
                            <div className="row g-2">
                              <div className="col-6">
                                <strong>Vehículo ID:</strong> #{v.vehiculo}
                              </div>
                              <div className="col-6">
                                <strong>Conductor ID:</strong> #{v.conductor}
                              </div>
                              <div className="col-12 text-muted">
                                Publicado bajo reglas universitarias de transporte RaidU.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer con acciones */}
                      <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top flex-wrap gap-2">
                        <button
                          className="btn btn-link btn-sm text-decoration-none p-0 text-muted"
                          onClick={() => setDetalleId(expandido ? null : v.id)}
                        >
                          <i className={`bi bi-chevron-${expandido ? 'up' : 'down'} me-1`} />
                          {expandido ? 'Menos detalles' : 'Más detalles'}
                        </button>

                        <div className="d-flex gap-1 flex-wrap">
                          {/* Controles de estado y edición para el conductor o admin */}
                          {puedeModificar(v) && (
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => abrirEditar(v)}
                              title="Editar viaje"
                            >
                              <i className="bi bi-pencil me-1" />Editar
                            </button>
                          )}

                          {!esSoporte && (esConductor(v) || esAdmin) && ['publicado', 'lleno'].includes(v.estado) && (
                            <button
                              className="btn btn-outline-info btn-sm"
                              onClick={() => cambiarEstado(v, 'en_curso')}
                              title="Iniciar recorrido"
                            >
                              <i className="bi bi-play-fill me-1" />Iniciar
                            </button>
                          )}

                          {!esSoporte && (esConductor(v) || esAdmin) && v.estado === 'en_curso' && (
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => cambiarEstado(v, 'finalizado')}
                              title="Finalizar viaje"
                            >
                              <i className="bi bi-check-circle me-1" />Finalizar
                            </button>
                          )}

                          {/* Calificar viaje si está finalizado Y el usuario participó */}
                          {(efectivo === 'finalizado') && esParticipante(v) && (
                            <button
                              className="btn btn-outline-warning btn-sm text-dark d-inline-flex align-items-center gap-1"
                              onClick={() => navigate(`/calificaciones?viaje=${v.id}`)}
                              title="Calificar a los participantes de este viaje finalizado"
                            >
                              <i className="bi bi-star-fill text-warning" />
                              <span>Calificar</span>
                            </button>
                          )}

                          {puedeModificar(v) && (
                            <button
                              className="btn btn-outline-warning btn-sm text-dark"
                              onClick={() => cambiarEstado(v, 'cancelado')}
                              title="Cancelar viaje"
                            >
                              <i className="bi bi-x-circle me-1" />Cancelar
                            </button>
                          )}

                          {(esConductor(v) || esAdmin) && v.estado === 'publicado' && !pasado && (
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => eliminarViaje(v)}
                              title="Eliminar viaje"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Paginación del backend (RF2-08) ── */}
          {totalPages > 1 && (
            <nav className="mt-4 d-flex justify-content-center" aria-label="Navegación de viajes">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => cargarViajes(page - 1)}
                    disabled={page <= 1}
                  >
                    <i className="bi bi-chevron-left me-1" />Anterior
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => cargarViajes(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => cargarViajes(page + 1)}
                    disabled={page >= totalPages}
                  >
                    Siguiente<i className="bi bi-chevron-right ms-1" />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </>
  );
}
