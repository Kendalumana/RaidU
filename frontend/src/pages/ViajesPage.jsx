import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';
import { getMisViajes, getViajes, createViaje, updateViaje, deleteViaje } from '../services/viajeService.js';
import FormViaje from '../components/FormViaje.jsx';
import { Link } from 'react-router-dom';

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
const estadoBadge = (val) => ESTADOS.find((e) => e.value === val) || { label: val, color: 'secondary' };

const FORM_VACIO = {
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
  const { user, esAdmin } = useAuth();

  /* ── vista activa: 'mis_viajes' (participante) o 'todos' (catálogo general) ── */
  const [vista, setVista] = useState('mis_viajes');

  /* ── estado listado ── */
  const [viajes, setViajes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
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
      const lista = data.results || [];
      // Filtrar vehículos activos pertenecientes al usuario actual
      const propios = lista.filter(
        (v) => v.activo !== false && (user?.id ? Number(v.propietario) === Number(user?.id) : true)
      );
      setMisVehiculos(propios);
      setTieneVehiculos(propios.length > 0);
    } catch {
      setMisVehiculos([]);
      setTieneVehiculos(false);
    } finally {
      setLoadingVeh(false);
    }
  }, [user?.id]);

  /* ═══ 2. Cargar viajes con filtros y paginación del backend ═══ */
  const cargarViajes = useCallback(
    async (p = 1) => {
      setLoading(true);
      setListError('');
      try {
        const data =
          vista === 'mis_viajes'
            ? await getMisViajes(filtros, p)
            : await getViajes(filtros, p);
        setViajes(data.resultados || []);
        setPage(data.pagina_actual || p);
        setTotalPages(data.total_paginas || 1);
        setTotalCount(data.total_registros || 0);
      } catch (err) {
        setListError(getError(err));
      } finally {
        setLoading(false);
      }
    },
    [filtros, vista]
  );

  useEffect(() => {
    cargarVehiculos();
  }, [cargarVehiculos]);

  useEffect(() => {
    cargarViajes(1);
  }, [filtros, vista]);

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
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const limpiarFiltros = () => {
    setFiltros({
      sede_origen: '',
      sede_destino: '',
      estado: '',
      fecha: '',
      ordering: 'fecha_hora',
    });
    setPage(1);
  };

  const cambiarVista = (nuevaVista) => {
    if (nuevaVista !== vista) {
      setVista(nuevaVista);
      setPage(1);
    }
  };

  const abrirCrear = () => {
    if (!tieneVehiculos) return;
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

  const abrirEditar = (v) => {
    const veh = misVehiculos.find((x) => x.id === v.vehiculo);
    const cap = veh ? veh.capacidad : v.cupos_totales || 5;
    setMaxCupos(cap);
    setForm({
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
  const puedeModificar = (v) => (esConductor(v) || esAdmin) && ['publicado', 'lleno'].includes(v.estado);

  return (
    <>
      {/* ── Encabezado ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">
            <i className="bi bi-map me-2 text-success" />
            {vista === 'mis_viajes' ? 'Mis Viajes (Conductor / Pasajero)' : 'Catálogo General de Viajes'}
          </h1>
          <p className="text-secondary small mb-0">
            {vista === 'mis_viajes'
              ? 'Viajes que usted conduce o en los que participa con reserva confirmada'
              : 'Encuentre u ofrezca transporte compartido seguro entre sedes de la Universidad de Costa Rica'}
          </p>
        </div>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          <div className="btn-group shadow-sm" role="group" aria-label="Selector de viajes">
            <button
              type="button"
              className={`btn btn-sm ${vista === 'mis_viajes' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
              onClick={() => cambiarVista('mis_viajes')}
            >
              <i className="bi bi-person-badge me-1" />
              Mis Viajes
            </button>
            <button
              type="button"
              className={`btn btn-sm ${vista === 'todos' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
              onClick={() => cambiarVista('todos')}
            >
              <i className="bi bi-compass me-1" />
              Todos los Viajes
            </button>
          </div>

          <button
            className={`btn btn-outline-secondary btn-sm ${showFiltros ? 'active' : ''}`}
            onClick={() => setShowFiltros(!showFiltros)}
          >
            <i className="bi bi-funnel me-1" />
            {showFiltros ? 'Ocultar filtros' : 'Filtros'}
          </button>
          {!showForm && (
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
      {!loadingVeh && !tieneVehiculos && (
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
        <FormViaje
          form={form}
          formErrors={formErrors}
          editId={editId}
          saving={saving}
          misVehiculos={misVehiculos}
          maxCupos={maxCupos}
          sedes={SEDES}
          onChange={change}
          onSubmit={guardar}
          onCancel={cancelarForm}
        />
      )}

      {/* ── Listado de viajes: separación explícita de carga, fallo, vacío y datos ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status" />
          <p className="mt-2 text-secondary">Cargando viajes disponibles…</p>
        </div>
      ) : listError ? (
        <div className="card border-0 shadow-sm border-start border-4 border-danger mb-4">
          <div className="card-body text-center py-5">
            <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-inline-flex p-3 mb-3">
              <i className="bi bi-exclamation-triangle-fill fs-2" />
            </div>
            <h5 className="fw-semibold text-danger">Error al consultar los viajes</h5>
            <p className="text-muted small mb-3">{listError}</p>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm px-3"
              onClick={() => cargarViajes(page)}
            >
              <i className="bi bi-arrow-clockwise me-1" />
              Reintentar consulta
            </button>
          </div>
        </div>
      ) : viajes.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
              <i className="bi bi-map text-secondary fs-1" />
            </div>
            <h5 className="fw-semibold text-secondary">No se encontraron viajes</h5>
            <p className="text-muted small mb-3">
              {Object.values(filtros).some(Boolean)
                ? 'No hay viajes que coincidan con los filtros seleccionados.'
                : 'Aún no se han publicado viajes en el sistema.'}
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
              const est = estadoBadge(v.estado);
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
                            {mio && (
                              <span className="badge bg-success bg-opacity-10 text-success">
                                <i className="bi bi-person-check-fill me-1" />Mi viaje
                              </span>
                            )}
                            <span className="text-muted small">#{v.id}</span>
                          </div>

                          <span className="fw-bold text-success fs-5">
                            ₡{Number(v.costo_total).toLocaleString('es-CR')}
                          </span>
                        </div>

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
                            <strong className="text-dark">{v.cupos_disponibles}</strong> / {v.cupos_totales} cupos
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

                          {esConductor(v) && v.estado === 'publicado' && (
                            <button
                              className="btn btn-outline-info btn-sm"
                              onClick={() => cambiarEstado(v, 'en_curso')}
                              title="Iniciar recorrido"
                            >
                              <i className="bi bi-play-fill me-1" />Iniciar
                            </button>
                          )}

                          {esConductor(v) && v.estado === 'en_curso' && (
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => cambiarEstado(v, 'finalizado')}
                              title="Finalizar viaje"
                            >
                              <i className="bi bi-check-circle me-1" />Finalizar
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

                          {(esConductor(v) || esAdmin) && v.estado === 'publicado' && (
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
