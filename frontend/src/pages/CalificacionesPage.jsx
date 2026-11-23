import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';
import {
  listCalificaciones,
  addCalificacion,
  updateCalificacion,
  deleteCalificacion,
  getPromedioUsuario,
  listViajesFinalizados,
} from '../services/calificacionService.js';
import { listAllViajes, listAllMisReservas } from '../services/reservaService.js';

const nombresSede = {
  rodrigo_facio: 'Rodrigo Facio',
  san_ramon: 'San Ramón',
  esparza: 'Esparza',
  puntarenas: 'Puntarenas',
};

function formatFechaCorta(fechaIso) {
  if (!fechaIso) return '';
  const d = new Date(fechaIso);
  return d.toLocaleDateString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EstrellasPuntaje({ valor, size = '1.1rem', interactive = false, onChange = () => {} }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="d-inline-flex align-items-center gap-1">
      {[1, 2, 3, 4, 5].map((estrella) => {
        const activa = (hover || valor) >= estrella;
        return (
          interactive ? (
            <button key={estrella} type="button" className="btn p-0 border-0" aria-label={`${estrella} de 5 estrellas`} aria-pressed={valor === estrella}
              onClick={() => onChange(estrella)} onMouseEnter={() => setHover(estrella)} onMouseLeave={() => setHover(0)}>
              <i aria-hidden="true" className={`bi ${activa ? 'bi-star-fill text-warning' : 'bi-star text-secondary'}`} style={{ fontSize: size }} />
            </button>
          ) : (
            <i key={estrella} className={`bi ${activa ? 'bi-star-fill text-warning' : 'bi-star text-secondary'}`} style={{ fontSize: size }} />
          )
        );
      })}
    </div>
  );
}

export default function CalificacionesPage() {
  const { user, esAdmin, esSoporte } = useAuth();
  const [searchParams] = useSearchParams();

  // Estados de listado
  const [calificaciones, setCalificaciones] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [filtroPuntaje, setFiltroPuntaje] = useState('');
  const [filtroModo, setFiltroModo] = useState('recibidas'); // 'recibidas', 'emitidas', o 'todas' (solo staff)
  const [orden, setOrden] = useState('-fecha');

  // Promedio y métricas del usuario actual
  const [promedioInfo, setPromedioInfo] = useState({ promedio: null, total: 0 });

  // Viajes para correlación y formulario
  const [viajesFinalizados, setViajesFinalizados] = useState([]);
  const [viajesMap, setViajesMap] = useState({});
  const [participantes, setParticipantes] = useState([]);
  const [participantesError, setParticipantesError] = useState('');
  const [cargandoParticipantes, setCargandoParticipantes] = useState(false);

  // Modal de emisión / edición (modal responsive garantizado en móvil y desktop)
  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    viaje: '',
    calificado: '',
    puntaje: 5,
    comentario: '',
  });

  // Notificaciones
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Modal de confirmación para eliminar
  const [modalEliminar, setModalEliminar] = useState(null);

  // ───────────────────────────────────────────
  // CARGAR PROMEDIO DEL USUARIO
  // ───────────────────────────────────────────
  const cargarPromedio = useCallback(async () => {
    if (!user?.id) return;
    try {
      const stats = await getPromedioUsuario(user.id);
      setPromedioInfo(stats);
    } catch {
      // Si aún no tiene calificaciones registradas, se mantiene en null
    }
  }, [user]);

  // ───────────────────────────────────────────
  // CARGAR VIAJES (Para nombres y selectores)
  // REGLA: Solo se pueden calificar viajes donde el usuario haya participado
  // ───────────────────────────────────────────
  useEffect(() => {
    async function initViajes() {
      try {
        const [finalizados, todos, misReservas] = await Promise.all([
          listViajesFinalizados(),
          listAllViajes(),
          listAllMisReservas(user?.id),
        ]);

        const map = {};
        todos.forEach((v) => {
          map[v.id] = v;
        });
        finalizados.forEach((v) => {
          map[v.id] = v;
        });
        setViajesMap(map);

        // REGLA ESTRICTA: El usuario SOLO puede calificar viajes donde FUE PARTE:
        // 1) Es el conductor del viaje
        // 2) O tiene reserva confirmada en ese viaje
        const misReservasConfirmadasViajesIds = new Set(
          misReservas
            .filter((r) => r.estado === 'confirmada')
            .map((r) => Number(r.viaje))
        );

        const misViajesParticipados = finalizados.filter((v) => {
          const esConductor = user?.id && Number(v.conductor) === Number(user.id);
          const esPasajero = misReservasConfirmadasViajesIds.has(Number(v.id));
          return esConductor || esPasajero;
        });

        setViajesFinalizados(misViajesParticipados);
      } catch (err) {
        setError('No se pudieron cargar los viajes para calificar. Inténtalo de nuevo.');
      }
    }
    initViajes();
    cargarPromedio();
  }, [cargarPromedio, user?.id]);

  // Si llega con query param ?viaje=ID, abrir modal directamente
  useEffect(() => {
    const viajeParam = searchParams.get('viaje');
    if (viajeParam) {
      setEditando(null);
      setForm((prev) => ({
        ...prev,
        viaje: String(viajeParam),
        calificado: '',
        puntaje: 5,
        comentario: '',
      }));
      setModalFormVisible(true);
    }
  }, [searchParams]);

  // ───────────────────────────────────────────
  // CARGAR CALIFICACIONES
  // ───────────────────────────────────────────
  const recargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = {
        page: pagina,
        ordering: orden,
      };

      if (filtroPuntaje) params.puntaje = filtroPuntaje;

      if (filtroModo === 'recibidas' && user?.id) {
        params.calificado = user.id;
      } else if (filtroModo === 'emitidas' && user?.id) {
        params.calificador = user.id;
      }

      const res = await listCalificaciones(params);
      setCalificaciones(res.items);
      setPagina(res.page);
      setTotalPaginas(res.totalPages);
      setTotalRegistros(res.total);
    } catch (err) {
      setError(getError(err));
    } finally {
      setCargando(false);
    }
  }, [pagina, filtroPuntaje, filtroModo, orden, user]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // ───────────────────────────────────────────
  // FORMULARIO: VIAJE Y DESTINATARIOS
  // ───────────────────────────────────────────
  const viajeSeleccionadoObj = useMemo(() => {
    if (!form.viaje) return null;
    return viajesFinalizados.find((viaje) => Number(viaje.id) === Number(form.viaje)) || null;
  }, [form.viaje, viajesFinalizados]);

  useEffect(() => {
    setParticipantes([]);
    setParticipantesError('');
    if (!modalFormVisible || editando || !viajeSeleccionadoObj) return;
    let vigente = true;
    setCargandoParticipantes(true);
    api.get(`/viajes/${viajeSeleccionadoObj.id}/participantes/`)
      .then(({ data }) => { if (vigente) setParticipantes(data.participantes || []); })
      .catch(() => { if (vigente) setParticipantesError('No se pudieron cargar los participantes.'); })
      .finally(() => { if (vigente) setCargandoParticipantes(false); });
    return () => { vigente = false; };
  }, [viajeSeleccionadoObj, modalFormVisible, editando]);

  const candidatosACalificar = useMemo(() => participantes.map((p) => ({
    id: p.id, rol: p.rol, label: `${p.rol === 'conductor' ? 'Conductor' : 'Pasajero'}: ${p.correo || p.nombre}`,
  })), [participantes]);

  // Si hay exactamente 1 candidato (ej: el pasajero califica al conductor), preseleccionarlo automáticamente
  useEffect(() => {
    const conductor = candidatosACalificar.find((c) => c.rol === 'conductor');
    const elegido = conductor || (candidatosACalificar.length === 1 ? candidatosACalificar[0] : null);
    if (modalFormVisible && !editando && elegido) {
      setForm((prev) => ({
        ...prev,
        calificado: String(elegido.id),
      }));
    }
  }, [candidatosACalificar, editando, modalFormVisible]);

  // Abrir modal para nueva calificación
  const abrirNuevo = () => {
    setEditando(null);
    setForm({
      viaje: viajesFinalizados[0]?.id ? String(viajesFinalizados[0].id) : '',
      calificado: '',
      puntaje: 5,
      comentario: '',
    });
    setModalFormVisible(true);
  };

  // Abrir modal para editar
  const abrirEditar = (calif) => {
    setEditando(calif);
    setForm({
      viaje: String(calif.viaje),
      calificado: String(calif.calificado),
      puntaje: calif.puntaje,
      comentario: calif.comentario || '',
    });
    setModalFormVisible(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setExito('');

    try {
      if (editando) {
        await updateCalificacion(editando.id, {
          puntaje: form.puntaje,
          comentario: form.comentario,
        });
        setExito(`Calificación #${editando.id} actualizada correctamente.`);
      } else {
        if (!form.viaje || !candidatosACalificar.some((c) => String(c.id) === String(form.calificado))) {
          setError('Debe seleccionar el viaje y el participante a calificar.');
          setGuardando(false);
          return;
        }
        await addCalificacion(form);
        setExito('¡Calificación enviada exitosamente!');
        setPagina(1);
      }

      setModalFormVisible(false);
      setEditando(null);
      await recargar();
      await cargarPromedio();
    } catch (err) {
      setError(getError(err));
    } finally {
      setGuardando(false);
    }
  };

  // Confirmar eliminación
  const [eliminando, setEliminando] = useState(false);
  const confirmarEliminar = async () => {
    if (!modalEliminar || eliminando) return;
    setEliminando(true);
    try {
      await deleteCalificacion(modalEliminar.id);
      setExito(`Calificación #${modalEliminar.id} eliminada.`);
      setModalEliminar(null);
      await recargar();
      await cargarPromedio();
    } catch (err) {
      setError(getError(err));
      setModalEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <>
      {/* ═══════════════════════════════════════
          ENCABEZADO
      ═══════════════════════════════════════ */}
      <div className="mb-4">
        <p className="text-uppercase text-secondary small fw-semibold mb-1">
          RaidU / Reputación & Comunidad
        </p>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h1 className="h3 fw-bold mb-1">
              <i className="bi bi-star-fill text-warning me-2" />
              Calificaciones & Reseñas
            </h1>
            <p className="text-secondary mb-0">
              Evaluación transparente de viajes compartidos finalizados en la UCR.
            </p>
          </div>

          {!esSoporte && (
            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm rounded-pill px-4"
              onClick={abrirNuevo}
            >
              <i className="bi bi-plus-lg" />
              <span>Nueva calificación</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          TARJETAS KPI DE REPUTACIÓN
      ═══════════════════════════════════════ */}
      <div className="row g-3 mb-4">
        {/* Promedio Personal */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
            <div className="card-body p-4 d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white"
                style={{
                  width: 56,
                  height: 56,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  fontSize: '1.5rem',
                }}
              >
                <i className="bi bi-award-fill" />
              </div>
              <div>
                <small className="text-secondary fw-semibold text-uppercase d-block">
                  Tu Promedio Recibido
                </small>
                <div className="d-flex align-items-baseline gap-2 mt-1">
                  <span className="h3 fw-bold mb-0 text-dark">
                    {promedioInfo.promedio !== null ? Number(promedioInfo.promedio).toFixed(1) : '—'}
                  </span>
                  {promedioInfo.promedio !== null && (
                    <EstrellasPuntaje valor={Math.round(promedioInfo.promedio)} size="0.95rem" />
                  )}
                </div>
                <small className="text-secondary">
                  {promedioInfo.total} {promedioInfo.total === 1 ? 'evaluación recibida' : 'evaluaciones recibidas'}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Total en el apartado activo */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
            <div className="card-body p-4 d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white"
                style={{
                  width: 56,
                  height: 56,
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  fontSize: '1.5rem',
                }}
              >
                <i className="bi bi-chat-heart-fill" />
              </div>
              <div>
                <small className="text-secondary fw-semibold text-uppercase d-block">
                  {filtroModo === 'recibidas'
                    ? 'Recibidas por ti'
                    : filtroModo === 'emitidas'
                    ? 'Emitidas por ti'
                    : 'Total Registradas'}
                </small>
                <h2 className="h3 fw-bold mb-0 text-dark mt-1">
                  {totalRegistros}
                </h2>
                <small className="text-secondary">
                  {filtroModo === 'recibidas'
                    ? 'Calificaciones que te han dejado'
                    : filtroModo === 'emitidas'
                    ? 'Calificaciones que has otorgado'
                    : 'En el catálogo del sistema'}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Viajes Finalizados Evaluables */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
            <div className="card-body p-4 d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white"
                style={{
                  width: 56,
                  height: 56,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  fontSize: '1.5rem',
                }}
              >
                <i className="bi bi-check2-circle" />
              </div>
              <div>
                <small className="text-secondary fw-semibold text-uppercase d-block">
                  Viajes Finalizados
                </small>
                <h2 className="h3 fw-bold mb-0 text-dark mt-1">
                  {viajesFinalizados.length}
                </h2>
                <small className="text-secondary">
                  Habilitados para emitir calificación
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          ALERTAS
      ═══════════════════════════════════════ */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show rounded-3 shadow-sm mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2" />
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Cerrar" />
        </div>
      )}

      {exito && (
        <div className="alert alert-success alert-dismissible fade show rounded-3 shadow-sm mb-4" role="alert">
          <i className="bi bi-check-circle-fill me-2" />
          {exito}
          <button type="button" className="btn-close" onClick={() => setExito('')} aria-label="Cerrar" />
        </div>
      )}

      {/* ═══════════════════════════════════════
          LISTADO DE CALIFICACIONES
      ═══════════════════════════════════════ */}
      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          {/* PESTAÑAS / APARTADOS: RECIBIDAS VS EMITIDAS */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom pb-3 mb-4">
            <ul className="nav nav-pills gap-2" role="tablist">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link rounded-pill px-4 fw-semibold ${filtroModo === 'recibidas' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => {
                    setFiltroModo('recibidas');
                    setPagina(1);
                  }}
                >
                  <i className="bi bi-inbox-fill me-2" />
                  Calificaciones que me dieron
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link rounded-pill px-4 fw-semibold ${filtroModo === 'emitidas' ? 'active shadow-sm' : 'text-secondary'}`}
                  onClick={() => {
                    setFiltroModo('emitidas');
                    setPagina(1);
                  }}
                >
                  <i className="bi bi-send-check-fill me-2" />
                  Calificaciones que yo di
                </button>
              </li>
              {(esAdmin || esSoporte) && (
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link rounded-pill px-3 fw-semibold ${filtroModo === 'todas' ? 'active shadow-sm' : 'text-secondary'}`}
                    onClick={() => {
                      setFiltroModo('todas');
                      setPagina(1);
                    }}
                  >
                    <i className="bi bi-globe me-2" />
                    Todas (Staff)
                  </button>
                </li>
              )}
            </ul>

            <div className="d-flex flex-wrap gap-2">
              {/* Filtro por Puntaje */}
              <select
                className="form-select w-auto"
                value={filtroPuntaje}
                onChange={(e) => {
                  setFiltroPuntaje(e.target.value);
                  setPagina(1);
                }}
              >
                <option value="">Todas las estrellas</option>
                <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                <option value="4">⭐⭐⭐⭐ (4)</option>
                <option value="3">⭐⭐⭐ (3)</option>
                <option value="2">⭐⭐ (2)</option>
                <option value="1">⭐ (1)</option>
              </select>

              {/* Ordenamiento */}
              <select
                className="form-select w-auto"
                value={orden}
                onChange={(e) => {
                  setOrden(e.target.value);
                  setPagina(1);
                }}
              >
                <option value="-fecha">Más recientes</option>
                <option value="fecha">Más antiguas</option>
                <option value="-puntaje">Mayor puntaje</option>
                <option value="puntaje">Menor puntaje</option>
              </select>

              {(filtroPuntaje || orden !== '-fecha') && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setFiltroPuntaje('');
                    setOrden('-fecha');
                    setPagina(1);
                  }}
                >
                  <i className="bi bi-x-circle me-1" />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* TABLA O ESTADO DE CARGA */}
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="text-secondary mt-3 mb-0">Cargando calificaciones...</p>
            </div>
          ) : calificaciones.length === 0 ? (
            <div className="text-center py-5">
              <div
                className="rounded-circle bg-light text-warning d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: 70, height: 70 }}
              >
                <i className="bi bi-star fs-2" />
              </div>
              <h3 className="h5 fw-bold">
                {filtroModo === 'recibidas'
                  ? 'Aún no has recibido calificaciones'
                  : filtroModo === 'emitidas'
                  ? 'Aún no has emitido calificaciones'
                  : 'No hay calificaciones registradas'}
              </h3>
              <p className="text-secondary mb-3">
                {filtroPuntaje
                  ? 'No hay calificaciones que coincidan con el puntaje seleccionado.'
                  : filtroModo === 'recibidas'
                  ? 'Las calificaciones que otros participantes dejen sobre tus viajes aparecerán aquí.'
                  : 'Aquí verás las evaluaciones que hayas realizado a conductores o pasajeros.'}
              </p>
              {!esSoporte && (
                <button type="button" className="btn btn-outline-primary btn-sm rounded-pill" onClick={abrirNuevo}>
                  <i className="bi bi-plus-lg me-1" />
                  Calificar un viaje ahora
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Viaje</th>
                    <th>Calificador</th>
                    <th>Calificado</th>
                    <th>Puntaje</th>
                    <th>Comentario</th>
                    <th>Fecha</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {calificaciones.map((calif) => {
                    const viaje = viajesMap[calif.viaje];
                    const esAutor = user?.id && Number(calif.calificador) === Number(user.id);
                    const puedeModificar = (esAutor || esAdmin) && !esSoporte;

                    return (
                      <tr key={calif.id}>
                        {/* ID */}
                        <td className="text-secondary fw-medium">
                          #{calif.id}
                        </td>

                        {/* VIAJE */}
                        <td>
                          <div className="fw-semibold">
                            {viaje?.nombre || `Viaje #${calif.viaje}`}
                          </div>
                          {viaje && (
                            <small className="text-secondary">
                              {nombresSede[viaje.sede_origen] || viaje.sede_origen} →{' '}
                              {nombresSede[viaje.sede_destino] || viaje.sede_destino}
                            </small>
                          )}
                        </td>

                        {/* CALIFICADOR */}
                        <td>
                          <span className={`badge ${esAutor ? 'bg-primary-subtle text-primary' : 'text-bg-light border'}`}>
                            {esAutor ? 'Tú (Calificador)' : `Usuario #${calif.calificador}`}
                          </span>
                        </td>

                        {/* CALIFICADO */}
                        <td>
                          <span className="badge text-bg-secondary">
                            Usuario #{calif.calificado}
                          </span>
                        </td>

                        {/* PUNTAJE */}
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <EstrellasPuntaje valor={calif.puntaje} size="0.95rem" />
                            <span className="fw-bold small">({calif.puntaje})</span>
                          </div>
                        </td>

                        {/* COMENTARIO */}
                        <td style={{ maxWidth: 260 }}>
                          <span className="text-truncate d-block small" title={calif.comentario}>
                            {calif.comentario || <em className="text-secondary">Sin comentario</em>}
                          </span>
                        </td>

                        {/* FECHA */}
                        <td className="small text-secondary">
                          {formatFechaCorta(calif.fecha)}
                        </td>

                        {/* ACCIONES */}
                        <td className="text-end text-nowrap">
                          {puedeModificar ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm me-2"
                                onClick={() => abrirEditar(calif)}
                                title="Editar calificación"
                              >
                                <i className="bi bi-pencil me-1" />
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => setModalEliminar(calif)}
                                title="Eliminar calificación"
                              >
                                <i className="bi bi-trash me-1" />
                                Eliminar
                              </button>
                            </>
                          ) : (
                            <span className="text-secondary small fst-italic">Solo lectura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINACIÓN */}
          {totalPaginas > 1 && (
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-3 border-top mt-3">
              <small className="text-secondary">
                Página {pagina} de {totalPaginas} ({totalRegistros} {totalRegistros === 1 ? 'registro' : 'registros'})
              </small>
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                >
                  <i className="bi bi-chevron-left me-1" />
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
                >
                  Siguiente
                  <i className="bi bi-chevron-right ms-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          MODAL RESPONSIVE DE EMISIÓN / EDICIÓN
          (Funciona perfectamente en móvil y desktop)
      ═══════════════════════════════════════ */}
      {modalFormVisible && !esSoporte && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom pb-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-star-half text-warning fs-4" />
                    <div>
                      <h3 className="modal-title h5 fw-bold mb-0">
                        {editando ? `Editar Calificación #${editando.id}` : 'Emitir Calificación de Viaje'}
                      </h3>
                      <small className="text-secondary">
                        {editando
                          ? 'Modifique el puntaje de estrellas o el comentario.'
                          : 'Asigne su calificación al participante del viaje finalizado.'}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setModalFormVisible(false);
                      setEditando(null);
                    }}
                    aria-label="Cerrar"
                  />
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      {/* AVISO SI NO TIENE VIAJES PARTICIPADOS */}
                      {viajesFinalizados.length === 0 && !editando && (
                        <div className="col-12">
                          <div className="alert alert-warning mb-1">
                            <i className="bi bi-exclamation-triangle-fill me-2" />
                            <strong>Sin viajes finalizados propios:</strong> Solo puedes emitir calificaciones para viajes en los que hayas participado (como conductor o como pasajero con reserva confirmada).
                          </div>
                        </div>
                      )}

                      {/* SELECT DE VIAJE */}
                      <div className="col-12 col-md-6">
                        <label htmlFor="calif-viaje" className="form-label fw-semibold">
                          Viaje Finalizado *
                        </label>
                        <select
                          id="calif-viaje"
                          className="form-select"
                          value={form.viaje}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              viaje: e.target.value,
                              calificado: '',
                            }))
                          }
                          disabled={Boolean(editando) || viajesFinalizados.length === 0}
                          required
                        >
                          <option value="">
                            {viajesFinalizados.length === 0
                              ? 'No tienes viajes finalizados en los que hayas participado'
                              : 'Seleccione un viaje finalizado...'}
                          </option>
                          {viajesFinalizados.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.nombre ? `${v.nombre} — ` : ''}
                              {formatFechaCorta(v.fecha_hora)} ·{' '}
                              {nombresSede[v.sede_origen] || v.sede_origen} →{' '}
                              {nombresSede[v.sede_destino] || v.sede_destino} · Viaje #{v.id}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* DESTINATARIO (CALIFICADO) */}
                      <div className="col-12 col-md-6">
                        <label htmlFor="calif-destinatario" className="form-label fw-semibold">
                          Usuario a Calificar *
                        </label>
                        {editando ? (
                          <input
                            id="calif-destinatario"
                            type="text"
                            className="form-control"
                            value={`Usuario #${editando.calificado}`}
                            disabled
                          />
                        ) : candidatosACalificar.length > 0 ? (
                          <select
                            id="calif-destinatario"
                            className="form-select"
                            value={form.calificado}
                            onChange={(e) => setForm((prev) => ({ ...prev, calificado: e.target.value }))}
                            required
                          >
                            <option value="">Seleccione al participante...</option>
                            {candidatosACalificar.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p id="calif-destinatario" className="text-secondary small mb-0" role="status">
                            {cargandoParticipantes ? 'Cargando participantes...' : participantesError || (form.viaje ? 'No hay participantes disponibles para seleccionar en este viaje.' : 'Seleccioná un viaje para ver a quién podés calificar.')}
                          </p>
                        )}
                        <small className="text-secondary d-block mt-1">
                          Solo pueden evaluarse personas que hayan participado en el viaje.
                        </small>
                      </div>

                      {/* PUNTAJE (ESTRELLAS INTERACTIVAS) */}
                      <div className="col-12">
                        <label className="form-label fw-semibold d-block mb-1">
                          Puntaje ({form.puntaje} {form.puntaje === 1 ? 'estrella' : 'estrellas'}) *
                        </label>
                        <div className="p-3 bg-light rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                          <EstrellasPuntaje
                            valor={Number(form.puntaje)}
                            size="2rem"
                            interactive
                            onChange={(p) => setForm((prev) => ({ ...prev, puntaje: p }))}
                          />
                          <span className="fw-bold text-dark fs-5">
                            {form.puntaje} / 5
                          </span>
                        </div>
                      </div>

                      {/* COMENTARIO */}
                      <div className="col-12">
                        <label htmlFor="calif-comentario" className="form-label fw-semibold">
                          Comentario u Observaciones (Opcional)
                        </label>
                        <textarea
                          id="calif-comentario"
                          rows="3"
                          className="form-control"
                          placeholder="Escriba cómo estuvo la experiencia, puntualidad, respeto, etc..."
                          value={form.comentario}
                          onChange={(e) => setForm((prev) => ({ ...prev, comentario: e.target.value }))}
                          maxLength={500}
                        />
                        <small className="text-secondary">Máximo 500 caracteres.</small>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setModalFormVisible(false);
                        setEditando(null);
                      }}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={guardando || (!editando && viajesFinalizados.length === 0)}
                    >
                      <i className="bi bi-send-fill me-2" />
                      {guardando ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Enviar Calificación'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1060 }} />
        </>
      )}

      {/* ═══════════════════════════════════════
          MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
      ═══════════════════════════════════════ */}
      {modalEliminar && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0">
                  <h3 className="modal-title h5 fw-bold text-danger">
                    <i className="bi bi-trash me-2" />
                    Eliminar Calificación #{modalEliminar.id}
                  </h3>
                  <button
                    type="button"
                    className="btn-close"
                    disabled={eliminando}
                    onClick={() => setModalEliminar(null)}
                    aria-label="Cerrar"
                  />
                </div>
                <div className="modal-body py-3">
                  <p className="mb-2">
                    ¿Está seguro de que desea eliminar la calificación de{' '}
                    <strong>{modalEliminar.puntaje} estrellas</strong> al Usuario #{modalEliminar.calificado} en el Viaje #{modalEliminar.viaje}?
                  </p>
                  <p className="small text-secondary mb-0">
                    Esta acción actualizará el promedio de reputación del usuario evaluado.
                  </p>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={eliminando}
                    onClick={() => setModalEliminar(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={eliminando}
                    onClick={confirmarEliminar}
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1060 }} />
        </>
      )}
    </>
  );
}
