import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';
import { Link } from 'react-router-dom';

export default function CalificacionesPage() {
  const { user, esAdmin, esSoporte } = useAuth();

  /* ── Estados principales ── */
  const [tab, setTab] = useState('recibidas'); // 'recibidas' | 'realizadas' | 'nueva'
  const [calificaciones, setCalificaciones] = useState([]);
  const [promedioInfo, setPromedioInfo] = useState({ promedio: null, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  /* ── Paginación ── */
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  /* ── Filtro de estrellas ── */
  const [filtroPuntaje, setFiltroPuntaje] = useState('');

  /* ── Formulario de Calificación (Crear / Editar) ── */
  const [form, setForm] = useState({
    viaje: '',
    calificado: '',
    puntaje: 5,
    comentario: '',
  });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  /* ── Datos de apoyo para el formulario ── */
  const [viajesFinalizados, setViajesFinalizados] = useState([]);
  const [usuariosCandidatos, setUsuariosCandidatos] = useState([]);
  const [loadingFormSupport, setLoadingFormSupport] = useState(false);

  /* ═══ 1. Cargar promedio y reputación del usuario ═══ */
  const cargarPromedio = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await api.get(`/calificaciones/promedio/${user.id}/`);
      setPromedioInfo({
        promedio: data.promedio,
        total: data.total_calificaciones ?? 0,
      });
    } catch {
      setPromedioInfo({ promedio: null, total: 0 });
    }
  }, [user?.id]);

  /* ═══ 2. Cargar calificaciones según pestaña activa ═══ */
  const cargarCalificaciones = useCallback(
    async (p = 1) => {
      if (!user?.id) return;
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: p });
        if (tab === 'recibidas') {
          params.set('calificado', user.id);
        } else if (tab === 'realizadas') {
          params.set('calificador', user.id);
        }

        if (filtroPuntaje) {
          params.set('puntaje', filtroPuntaje);
        }

        const { data } = await api.get(`/calificaciones/?${params}`);
        setCalificaciones(data.resultados || []);
        setPage(data.pagina_actual || p);
        setTotalPages(data.total_paginas || 1);
        setTotalRegistros(data.total_registros || 0);
      } catch (err) {
        setError(getError(err));
      } finally {
        setLoading(false);
      }
    },
    [user?.id, tab, filtroPuntaje]
  );

  /* ═══ 3. Cargar viajes finalizados para el formulario ═══ */
  const cargarViajesFinalizados = useCallback(async () => {
    setLoadingFormSupport(true);
    try {
      // Consultar viajes finalizados
      const { data } = await api.get('/viajes/?estado=finalizado&page=1');
      const viajes = data.resultados || [];
      setViajesFinalizados(viajes);
    } catch {
      setViajesFinalizados([]);
    } finally {
      setLoadingFormSupport(false);
    }
  }, []);

  useEffect(() => {
    cargarPromedio();
  }, [cargarPromedio]);

  useEffect(() => {
    if (tab !== 'nueva') {
      cargarCalificaciones(1);
    } else {
      cargarViajesFinalizados();
    }
  }, [tab, cargarCalificaciones, cargarViajesFinalizados]);

  /* ═══ 4. Detectar participantes cuando se selecciona un viaje ═══ */
  const handleViajeChange = async (viajeId) => {
    setForm((prev) => ({ ...prev, viaje: viajeId, calificado: '' }));
    setFormErrors((prev) => ({ ...prev, viaje: '', calificado: '' }));

    if (!viajeId) {
      setUsuariosCandidatos([]);
      return;
    }

    try {
      // Obtener reservas de ese viaje para encontrar a los pasajeros
      const { data } = await api.get(`/reservas/?viaje=${viajeId}`);
      const reservas = data.resultados || [];
      const viajeSeleccionado = viajesFinalizados.find((v) => v.id === Number(viajeId));

      const candidatos = [];

      // Si yo no soy el conductor, el conductor es un candidato para calificar
      if (viajeSeleccionado && Number(viajeSeleccionado.conductor) !== Number(user?.id)) {
        candidatos.push({
          id: viajeSeleccionado.conductor,
          label: `Conductor del viaje (Usuario #${viajeSeleccionado.conductor})`,
        });
      }

      // Si yo soy el conductor u otro pasajero, los pasajeros confirmados son candidatos
      reservas.forEach((r) => {
        if (Number(r.pasajero) !== Number(user?.id) && r.estado === 'confirmada') {
          candidatos.push({
            id: r.pasajero,
            label: `Pasajero (Usuario #${r.pasajero})`,
          });
        }
      });

      setUsuariosCandidatos(candidatos);
    } catch {
      setUsuariosCandidatos([]);
    }
  };

  /* ═══ 5. Guardar Calificación (POST o PATCH) ═══ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.viaje && !editId) errs.viaje = 'Debe seleccionar un viaje finalizado.';
    if (!form.calificado && !editId) errs.calificado = 'Debe indicar al usuario a calificar.';
    if (!form.puntaje || form.puntaje < 1 || form.puntaje > 5) {
      errs.puntaje = 'El puntaje debe ser entre 1 y 5 estrellas.';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    setError('');
    setMsg('');

    try {
      if (editId) {
        await api.patch(`/calificaciones/${editId}/`, {
          puntaje: Number(form.puntaje),
          comentario: (form.comentario || '').trim(),
        });
        setMsg('Calificación actualizada correctamente.');
      } else {
        await api.post('/calificaciones/', {
          viaje: Number(form.viaje),
          calificado: Number(form.calificado),
          puntaje: Number(form.puntaje),
          comentario: (form.comentario || '').trim(),
        });
        setMsg('¡Calificación enviada exitosamente! Gracias por fomentar la confianza en RaidU.');
      }

      setForm({ viaje: '', calificado: '', puntaje: 5, comentario: '' });
      setEditId(null);
      setTab('realizadas');
      cargarPromedio();
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

  /* ═══ 6. Abrir formulario de edición ═══ */
  const abrirEditar = (cal) => {
    setEditId(cal.id);
    setForm({
      viaje: cal.viaje,
      calificado: cal.calificado,
      puntaje: cal.puntaje,
      comentario: cal.comentario || '',
    });
    setTab('nueva');
  };

  /* ═══ 7. Eliminar calificación ═══ */
  const eliminarCalificacion = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta calificación? Esta acción no se puede deshacer.')) {
      return;
    }
    setMsg('');
    setError('');
    try {
      await api.delete(`/calificaciones/${id}/`);
      setMsg('Calificación eliminada correctamente.');
      cargarCalificaciones(page);
      cargarPromedio();
    } catch (err) {
      setError(getError(err));
    }
  };

  /* ── Estrellas interactivas en el formulario ── */
  const renderEstrellasSelector = () => {
    return (
      <div className="d-flex align-items-center gap-1 my-2">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            type="button"
            key={val}
            className="btn btn-link p-0 text-decoration-none border-0"
            onClick={() => setForm((prev) => ({ ...prev, puntaje: val }))}
            style={{ fontSize: '1.75rem', color: val <= form.puntaje ? '#f59e0b' : '#cbd5e1' }}
            title={`${val} estrella${val > 1 ? 's' : ''}`}
          >
            <i className={`bi ${val <= form.puntaje ? 'bi-star-fill' : 'bi-star'}`} />
          </button>
        ))}
        <span className="ms-2 fw-bold text-dark fs-5">{form.puntaje} / 5</span>
      </div>
    );
  };

  /* ── Render de estrellas para tarjetas ── */
  const renderEstrellasFijas = (puntaje) => {
    return (
      <div className="d-inline-flex align-items-center gap-1 text-warning">
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} className={`bi ${i <= puntaje ? 'bi-star-fill' : 'bi-star'} small`} />
        ))}
        <span className="ms-1 fw-bold text-dark small">{puntaje}.0</span>
      </div>
    );
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* ── Encabezado ── */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">
            <i className="bi bi-star-fill text-warning me-2" />
            Calificaciones & Reseñas
          </h1>
          <p className="text-secondary small mb-0">
            Fomente la seguridad y confianza universitaria evaluando sus viajes compartidos
          </p>
        </div>

        {tab !== 'nueva' && !esSoporte && (
          <button
            type="button"
            className="btn btn-primary rounded-pill px-4 shadow-sm"
            onClick={() => {
              setEditId(null);
              setForm({ viaje: '', calificado: '', puntaje: 5, comentario: '' });
              setTab('nueva');
            }}
          >
            <i className="bi bi-plus-lg me-1" />
            Calificar Experiencia
          </button>
        )}
      </div>

      {/* ── Alertas ── */}
      {msg && (
        <div className="alert alert-success alert-dismissible fade show rounded-4 py-3 d-flex align-items-center" role="alert">
          <i className="bi bi-check-circle-fill fs-5 me-2" />
          <div className="flex-grow-1 small fw-medium">{msg}</div>
          <button type="button" className="btn-close" onClick={() => setMsg('')} aria-label="Cerrar" />
        </div>
      )}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show rounded-4 py-3 d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill fs-5 me-2" />
          <div className="flex-grow-1 small fw-medium">{error}</div>
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Cerrar" />
        </div>
      )}

      {/* ── Tarjeta de Reputación Personal ── */}
      <div className="card-white p-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-4 text-center border-end-md">
            <div className="d-inline-flex flex-column align-items-center">
              <div className="display-5 fw-bold text-dark mb-1">
                {promedioInfo.promedio !== null ? Number(promedioInfo.promedio).toFixed(1) : '—'}
              </div>
              <div className="d-flex align-items-center gap-1 text-warning fs-5 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <i
                    key={i}
                    className={`bi ${
                      promedioInfo.promedio !== null && i <= Math.round(promedioInfo.promedio)
                        ? 'bi-star-fill'
                        : 'bi-star'
                    }`}
                  />
                ))}
              </div>
              <span className="text-secondary small">
                {promedioInfo.total} valoración{promedioInfo.total !== 1 ? 'es' : ''} recibida{promedioInfo.total !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="col-12 col-md-8 ps-md-4">
            <h6 className="fw-bold text-dark mb-2">Comunidad Universitaria de Confianza</h6>
            <p className="text-secondary small mb-3">
              Las calificaciones en RaidU son emitidas exclusivamente entre estudiantes y conductores que han completado
              juntos un viaje intersedes. Esta retroalimentación premia la puntualidad, cordialidad y seguridad en ruta.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 small">
                <i className="bi bi-shield-check me-1" />Perfil Verificado UCR
              </span>
              <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-2 small">
                <i className="bi bi-geo-alt me-1" />Sede del Pacífico
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navegación por pestañas ── */}
      <div className="d-flex justify-content-between align-items-center border-bottom pb-2 flex-wrap gap-2">
        <ul className="nav nav-pills gap-2" role="tablist">
          <li className="nav-item">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-4 fw-medium ${
                tab === 'recibidas' ? 'btn-primary' : 'btn-light text-secondary'
              }`}
              onClick={() => {
                setTab('recibidas');
                setEditId(null);
              }}
            >
              <i className="bi bi-box-arrow-in-down me-1" />
              Recibidas ({promedioInfo.total})
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-4 fw-medium ${
                tab === 'realizadas' ? 'btn-primary' : 'btn-light text-secondary'
              }`}
              onClick={() => {
                setTab('realizadas');
                setEditId(null);
              }}
            >
              <i className="bi bi-send me-1" />
              Realizadas por Mí
            </button>
          </li>
          {editId && (
            <li className="nav-item">
              <button type="button" className="btn btn-sm btn-warning rounded-pill px-4 fw-medium text-dark">
                <i className="bi bi-pencil me-1" />
                Editando #{editId}
              </button>
            </li>
          )}
        </ul>

        {tab !== 'nueva' && (
          <div className="d-flex align-items-center gap-2">
            <label className="text-secondary small fw-medium mb-0">Filtrar:</label>
            <select
              className="form-select form-select-sm rounded-pill px-3 border-light-subtle"
              style={{ width: 'auto', fontSize: '0.8rem' }}
              value={filtroPuntaje}
              onChange={(e) => setFiltroPuntaje(e.target.value)}
            >
              <option value="">Todas las estrellas</option>
              <option value="5">5 Estrellas ★★★★★</option>
              <option value="4">4 Estrellas ★★★★☆</option>
              <option value="3">3 Estrellas ★★★☆☆</option>
              <option value="2">2 Estrellas ★★☆☆☆</option>
              <option value="1">1 Estrella ★☆☆☆☆</option>
            </select>
          </div>
        )}
      </div>

      {/* ── Formulario de Calificación (tab === 'nueva') ── */}
      {tab === 'nueva' && (
        <div className="card-white p-4 border-top border-4 border-primary">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold text-dark mb-0">
              <i className={`bi ${editId ? 'bi-pencil-square' : 'bi-star'} text-primary me-2`} />
              {editId ? 'Editar Calificación' : 'Evaluar un Viaje Finalizado'}
            </h5>
            <button
              type="button"
              className="btn btn-light btn-sm rounded-circle"
              onClick={() => setTab('recibidas')}
              title="Cancelar"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Selector de viaje finalizado */}
              {!editId ? (
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold text-dark small">
                    Viaje Finalizado <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${formErrors.viaje ? 'is-invalid' : ''}`}
                    value={form.viaje}
                    onChange={(e) => handleViajeChange(e.target.value)}
                    disabled={loadingFormSupport || saving}
                  >
                    <option value="">— Seleccione un viaje finalizado —</option>
                    {viajesFinalizados.map((v) => (
                      <option key={v.id} value={v.id}>
                        Viaje #{v.id} • {v.sede_origen} ➔ {v.sede_destino} (
                        {v.fecha_hora ? new Date(v.fecha_hora).toLocaleDateString() : ''})
                      </option>
                    ))}
                  </select>
                  {formErrors.viaje && <div className="invalid-feedback">{formErrors.viaje}</div>}
                  <div className="form-text">
                    {viajesFinalizados.length === 0
                      ? 'No hay viajes finalizados disponibles para calificar en este momento.'
                      : 'Solo se pueden evaluar viajes que hayan concluido.'}
                  </div>
                </div>
              ) : (
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold text-dark small">Viaje Asociado</label>
                  <input type="text" className="form-control" value={`Viaje #${form.viaje}`} disabled />
                  <div className="form-text">El viaje asociado no se puede modificar.</div>
                </div>
              )}

              {/* Selector del usuario a calificar */}
              {!editId ? (
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold text-dark small">
                    Persona a Calificar <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${formErrors.calificado ? 'is-invalid' : ''}`}
                    value={form.calificado}
                    onChange={(e) => setForm((prev) => ({ ...prev, calificado: e.target.value }))}
                    disabled={!form.viaje || saving}
                  >
                    <option value="">
                      {!form.viaje
                        ? '— Primero elija un viaje —'
                        : usuariosCandidatos.length === 0
                        ? '— Sin participantes pendientes —'
                        : '— Seleccione al compañero —'}
                    </option>
                    {usuariosCandidatos.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.calificado && <div className="invalid-feedback">{formErrors.calificado}</div>}
                  <div className="form-text">Conductor o pasajero confirmado del viaje.</div>
                </div>
              ) : (
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold text-dark small">Usuario Calificado</label>
                  <input type="text" className="form-control" value={`Usuario #${form.calificado}`} disabled />
                  <div className="form-text">El usuario calificado no se puede modificar.</div>
                </div>
              )}

              {/* Selector interactivo de estrellas */}
              <div className="col-12">
                <label className="form-label fw-semibold text-dark small mb-0">
                  Puntaje de la Experiencia <span className="text-danger">*</span>
                </label>
                {renderEstrellasSelector()}
                {formErrors.puntaje && <div className="text-danger small">{formErrors.puntaje}</div>}
              </div>

              {/* Comentario opcional */}
              <div className="col-12">
                <label className="form-label fw-semibold text-dark small">
                  Comentario de Retroalimentación <span className="text-muted fw-normal">(Opcional)</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Describa la puntualidad, respeto, conducción segura y convivencia durante el viaje..."
                  value={form.comentario}
                  onChange={(e) => setForm((prev) => ({ ...prev, comentario: e.target.value }))}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-4"
                onClick={() => setTab('recibidas')}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1" />
                    {editId ? 'Guardar Cambios' : 'Publicar Calificación'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Listado de Calificaciones ── */}
      {tab !== 'nueva' && (
        <>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-2 text-secondary small">Cargando valoraciones…</p>
            </div>
          ) : calificaciones.length === 0 ? (
            <div className="card-white p-5 text-center">
              <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                <i className="bi bi-star text-secondary fs-1" />
              </div>
              <h5 className="fw-semibold text-dark">
                {tab === 'recibidas'
                  ? 'Aún no has recibido calificaciones'
                  : 'No has otorgado calificaciones todavía'}
              </h5>
              <p className="text-secondary small mb-3">
                {tab === 'recibidas'
                  ? 'Completa viajes compartidos con compañeros para comenzar a acumular estrellas en tu reputación.'
                  : 'Evalúa a los conductores y pasajeros con quienes has compartido viaje para ayudar a la comunidad.'}
              </p>
              {tab === 'realizadas' && !esSoporte && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm rounded-pill px-4"
                  onClick={() => setTab('nueva')}
                >
                  <i className="bi bi-plus-lg me-1" />
                  Calificar mi primer viaje
                </button>
              )}
            </div>
          ) : (
            <div className="row g-3">
              {calificaciones.map((c) => {
                const esMia = Number(c.calificador) === Number(user?.id);
                return (
                  <div className="col-12 col-md-6" key={c.id}>
                    <div className="card-white p-4 h-100 d-flex flex-column justify-content-between">
                      <div>
                        {/* Cabecera de la tarjeta */}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            {renderEstrellasFijas(c.puntaje)}
                            <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-calendar3 me-1" />
                              {c.fecha
                                ? new Date(c.fecha).toLocaleDateString('es-CR', {
                                    dateStyle: 'medium',
                                  })
                                : 'Fecha no registrada'}
                            </div>
                          </div>

                          <span className="badge bg-light text-secondary border small">
                            Viaje #{c.viaje}
                          </span>
                        </div>

                        {/* Comentario */}
                        <p className="text-dark small my-3 fst-italic">
                          {c.comentario ? `"${c.comentario}"` : <span className="text-muted">Sin comentario adicional.</span>}
                        </p>

                        <div className="d-flex align-items-center gap-2 small text-secondary pt-2 border-top">
                          <i className="bi bi-person-fill text-primary" />
                          <span>
                            {tab === 'recibidas'
                              ? `Calificado por Usuario #${c.calificador}`
                              : `Otorgada a Usuario #${c.calificado}`}
                          </span>
                        </div>
                      </div>

                      {/* Acciones para el autor o admin */}
                      {(esMia || esAdmin) && (
                        <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                          {esMia && (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => abrirEditar(c)}
                            >
                              <i className="bi bi-pencil me-1" />Editar
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => eliminarCalificacion(c.id)}
                          >
                            <i className="bi bi-trash me-1" />Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Paginación ── */}
          {totalPages > 1 && (
            <nav className="mt-4 d-flex justify-content-center" aria-label="Navegación de calificaciones">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => cargarCalificaciones(page - 1)}>
                    <i className="bi bi-chevron-left me-1" />Anterior
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => cargarCalificaciones(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => cargarCalificaciones(page + 1)}>
                    Siguiente<i className="bi bi-chevron-right ms-1" />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
