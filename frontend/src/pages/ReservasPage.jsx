import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { getError } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

import FormReserva from '../components/FormReserva.jsx';

import {
  addReserva,
  cancelReserva,
  deleteReserva,
  listAllMisReservas,
  listAllViajes,
  listReservas,
  updateReserva,
} from '../services/reservaService.js';

const nombresSede = {
  rodrigo_facio: 'Rodrigo Facio',
  san_ramon: 'San Ramón',
  esparza: 'Esparza',
  puntarenas: 'Puntarenas',
};

const estilosEstado = {
  pendiente: 'text-bg-warning',
  confirmada: 'text-bg-success',
  cancelada: 'text-bg-danger',
  en_curso: 'text-bg-info text-dark',
  completada: 'text-bg-secondary',
};

export const esPasadoViaje = (v) => Boolean(v?.fecha_hora && new Date(v.fecha_hora) <= new Date());

export const getEstadoReservaEfectivo = (reserva, viaje) => {
  if (reserva.estado === 'cancelada') {
    return { label: 'Cancelada', valor: 'cancelada' };
  }
  if (!viaje) {
    return { label: reserva.estado, valor: reserva.estado };
  }
  if (viaje.estado === 'cancelado') {
    return { label: 'Viaje cancelado', valor: 'cancelada' };
  }
  if (viaje.estado === 'en_curso') {
    return { label: 'En curso', valor: 'en_curso' };
  }
  if (viaje.estado === 'finalizado' || esPasadoViaje(viaje)) {
    return { label: 'Completada', valor: 'completada' };
  }
  return { label: 'Confirmada', valor: 'confirmada' };
};

function formatoDinero(valor) {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
  }).format(Number(valor || 0));
}

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

export default function ReservasPage() {
  const {
    user,
    esSoporte,
  } = useAuth();
  const navigate = useNavigate();

  // ───────────────────────────────────────────
  // ESTADOS
  // ───────────────────────────────────────────
  const [reservas, setReservas] = useState([]);
  const [misReservasTodas, setMisReservasTodas] = useState([]);
  const [viajes, setViajes] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [editando, setEditando] = useState(null);

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const [filtros, setFiltros] = useState({
    viaje: '',
  });

  const [confirmacion, setConfirmacion] = useState(null);

  // ───────────────────────────────────────────
  // MAPA VIAJE → DATOS
  // ───────────────────────────────────────────
  const viajesPorId = useMemo(
    () =>
      Object.fromEntries(
        viajes.map((viaje) => [
          viaje.id,
          viaje,
        ])
      ),
    [viajes]
  );

  // ───────────────────────────────────────────
  // VIAJES RESERVADOS POR EL USUARIO ACTUAL
  // ───────────────────────────────────────────
  const viajesReservadosIds = useMemo(() => {
    return new Set(
      misReservasTodas
        .filter((r) => !user?.id || Number(r.pasajero) === Number(user.id))
        .map((r) => Number(r.viaje))
    );
  }, [misReservasTodas, user]);

  // Viajes en los que el usuario tiene reservas activas (para el filtro)
  const viajesConMisReservas = useMemo(() => {
    const idsViajes = new Set(
      misReservasTodas
        .filter(
          (r) =>
            (!user?.id || Number(r.pasajero) === Number(user.id)) &&
            r.estado !== 'cancelada'
        )
        .map((r) => Number(r.viaje))
    );
    return viajes.filter((v) => idsViajes.has(Number(v.id)));
  }, [viajes, misReservasTodas, user]);

  // ───────────────────────────────────────────
  // CARGAR RESERVAS (SOLO PROPIAS Y ACTIVAS)
  // ───────────────────────────────────────────
  const recargar = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const params = {
        page: pagina,
        estado: 'confirmada', // Solo reservas confirmadas (las canceladas ni aparecen)
        ...(filtros.viaje ? { viaje: filtros.viaje } : {}),
      };

      if (user?.id) {
        params.pasajero = user.id; // Solo las que hizo el usuario
      }

      const [resultado, todas] = await Promise.all([
        listReservas(params),
        listAllMisReservas(user?.id).catch(() => []),
      ]);

      const activas = (resultado.items || []).filter(
        (r) => r.estado !== 'cancelada'
      );

      setReservas(activas);
      setMisReservasTodas(todas);
      setPagina(resultado.page);
      setTotalPaginas(resultado.totalPages);
      setTotal(resultado.total);

    } catch (e) {
      setError(getError(e));

    } finally {
      setCargando(false);
    }
  }, [pagina, filtros, user]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // ───────────────────────────────────────────
  // CARGAR VIAJES
  // ───────────────────────────────────────────
  useEffect(() => {
    async function cargarViajes() {
      try {
        const lista = await listAllViajes();
        const listaOrdenada = [...lista].sort(
          (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
        );
        setViajes(listaOrdenada);
      } catch (e) {
        setError(getError(e));
      }
    }

    cargarViajes();
  }, []);

  // ───────────────────────────────────────────
  // CREAR / EDITAR
  // ───────────────────────────────────────────
  const guardar = async (datos) => {
    setGuardando(true);
    setError('');
    setExito('');

    try {
      if (editando) {

        await updateReserva(editando.id, {
          cupos: datos.cupos,
        });

        setExito(
          `Reserva #${editando.id} actualizada correctamente.`
        );

        setEditando(null);

      } else {

        await addReserva({
          viaje: datos.viaje,
          cupos: datos.cupos,
        });

        setExito('Reserva creada correctamente.');
        setPagina(1);
      }

      await recargar();

      return true;

    } catch (e) {
      setError(getError(e));
      return false;

    } finally {
      setGuardando(false);
    }
  };

  // ───────────────────────────────────────────
  // CANCELAR MEDIANTE PATCH
  // ───────────────────────────────────────────
  const cancelar = async (reserva) => {
    setError('');
    setExito('');

    try {
      await cancelReserva(reserva.id);

      setExito(
        `Reserva #${reserva.id} cancelada correctamente.`
      );

      if (editando?.id === reserva.id) {
        setEditando(null);
      }

      await recargar();

    } catch (e) {
      setError(getError(e));
    }
  };

  // ───────────────────────────────────────────
  // DELETE
  // ───────────────────────────────────────────
  const eliminar = async (reserva) => {
    setError('');
    setExito('');

    try {
      await deleteReserva(reserva.id);

      setExito(
        `Reserva #${reserva.id} eliminada correctamente.`
      );

      if (editando?.id === reserva.id) {
        setEditando(null);
      }

      await recargar();

    } catch (e) {
      setError(getError(e));
    }
  };

  // ───────────────────────────────────────────
  // FILTROS
  // ───────────────────────────────────────────
  const actualizarFiltro = (event) => {
    const { name, value } = event.target;

    setFiltros((actuales) => ({
      ...actuales,
      [name]: value,
    }));

    setPagina(1);
  };

  const confirmarAccion = async () => {
    if (!confirmacion) return;

    const { tipo, reserva } = confirmacion;

    setConfirmacion(null);

    if (tipo === 'cancelar') {
      await cancelar(reserva);
    }

    if (tipo === 'eliminar') {
      await eliminar(reserva);
    }
  };

  const mensajeVacio = useMemo(() => {
    if (filtros.viaje) {
      return {
        titulo: 'No se encontraron reservas',
        texto:
          'No hay reservas activas que coincidan con el viaje seleccionado.',
      };
    }

    return {
      titulo: 'No tienes reservas activas',
      texto:
        'Cuando reserves un viaje disponible, aparecerá en esta sección.',
    };
  }, [filtros.viaje]);


  return (
    <>

      {/* ═══════════════════════════════════════
          ENCABEZADO
      ═══════════════════════════════════════ */}

      <div className="mb-4">
        <p className="text-uppercase text-secondary small fw-semibold mb-1">
          RaidU / Gestión de viajes
        </p>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">

          <div>
            <h1 className="h3 fw-bold mb-1">
              <i className="bi bi-bookmark-check-fill text-primary me-2" />
              Reservas
            </h1>

            <p className="text-secondary mb-0">
              Consulta y administra tus reservas de viajes.
            </p>
          </div>

          <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
            {total} {total === 1 ? 'reserva' : 'reservas'}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          ALERTAS
      ═══════════════════════════════════════ */}

      {error && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle-fill me-2" />
          {error}
        </div>
      )}

      {exito && (
        <div
          className="alert alert-success"
          role="status"
        >
          <i className="bi bi-check-circle-fill me-2" />
          {exito}
        </div>
      )}

      {/* ═══════════════════════════════════════
          FORMULARIO
          Soporte es solamente lectura
      ═══════════════════════════════════════ */}

      {!esSoporte && (
        <FormReserva
          reserva={editando}
          viajes={viajes}
          userId={user?.id}
          viajesReservadosIds={viajesReservadosIds}
          onSave={guardar}
          onCancel={() => setEditando(null)}
          saving={guardando}
        />
      )}

      {/* ═══════════════════════════════════════
          LISTADO
      ═══════════════════════════════════════ */}

      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">

          {/* FILTROS */}

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">

            <h2 className="h5 fw-bold mb-0">
              Listado de reservas
            </h2>

            <div className="d-flex flex-wrap gap-2">

              {/* Viaje */}
              <select
                className="form-select"
                name="viaje"
                value={filtros.viaje}
                onChange={actualizarFiltro}
                style={{ minWidth: 260 }}
              >
                <option value="">
                  Todos mis viajes reservados
                </option>

                {viajesConMisReservas.map((viaje) => (
                  <option
                    key={viaje.id}
                    value={viaje.id}
                  >
                    {viaje.nombre ? `${viaje.nombre} — ` : ''}
                    #{viaje.id} · {formatFechaCorta(viaje.fecha_hora)} · {nombresSede[viaje.sede_origen] || viaje.sede_origen} → {nombresSede[viaje.sede_destino] || viaje.sede_destino}
                  </option>
                ))}
              </select>

              {filtros.viaje && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setFiltros({
                      viaje: '',
                    });

                    setPagina(1);
                  }}
                >
                  <i className="bi bi-x-circle me-1" />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* LOADING */}

          {cargando ? (

            <div className="text-center py-5">

              <div
                className="spinner-border text-primary"
                role="status"
              >
                <span className="visually-hidden">
                  Cargando...
                </span>
              </div>

              <p className="text-secondary mt-3 mb-0">
                Cargando reservas...
              </p>
            </div>

          ) : reservas.length === 0 ? (

            /* EMPTY STATE */

            <div className="text-center py-5">

              <div
                className="rounded-circle bg-light text-primary d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: 70,
                  height: 70,
                }}
              >
                <i className="bi bi-bookmark-x fs-2" />
              </div>

              <h3 className="h5 fw-bold">
                {mensajeVacio.titulo}
              </h3>

              <p className="text-secondary mb-0">
                {mensajeVacio.texto}
              </p>
            </div>

          ) : (

            /* TABLA */

            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Viaje</th>
                    <th>Pasajero</th>
                    <th>Cupos</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th className="text-end">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reservas.map((reserva) => {

                    const viaje =
                      viajesPorId[reserva.viaje];
                    const estadoRes = getEstadoReservaEfectivo(reserva, viaje);
                    const esPasada = Boolean(viaje && (viaje.estado === 'finalizado' || esPasadoViaje(viaje)));
                    const esEnCurso = Boolean(viaje && viaje.estado === 'en_curso');

                    return (
                      <tr key={reserva.id}>

                        {/* ID */}
                        <td className="text-secondary">
                          #{reserva.id}
                        </td>

                        {/* VIAJE */}
                        <td>
                          <div className="fw-semibold">
                            {viaje?.nombre || (viaje ? `${nombresSede[viaje.sede_origen] || viaje.sede_origen} → ${nombresSede[viaje.sede_destino] || viaje.sede_destino}` : `Viaje #${reserva.viaje}`)}
                          </div>

                          {viaje && (
                            <div className="small text-secondary">
                              <span className="d-block text-dark fw-medium">
                                <i className="bi bi-clock me-1 text-primary" />
                                {formatFechaCorta(viaje.fecha_hora)}
                              </span>
                              <span>
                                {nombresSede[viaje.sede_origen] || viaje.sede_origen}
                                {' → '}
                                {nombresSede[viaje.sede_destino] || viaje.sede_destino}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* PASAJERO */}
                        <td>
                          {reserva.pasajero_correo || 'Correo no disponible'}
                        </td>

                        {/* CUPOS */}
                        <td>
                          <span className="badge text-bg-light border">
                            {reserva.cupos}
                          </span>
                        </td>

                        {/* MONTO */}
                        <td>
                          {formatoDinero(
                            reserva.monto_simulado
                          )}
                        </td>

                        {/* ESTADO */}
                        <td>
                          <span
                            className={`badge ${
                              estilosEstado[
                                estadoRes.valor
                              ] ||
                              'text-bg-secondary'
                            }`}
                          >
                            {estadoRes.label}
                          </span>
                          {esPasada && viaje?.estado !== 'cancelado' && (
                            <div className="small text-muted mt-1">
                              <i className="bi bi-clock-history me-1" />Viaje concluido
                            </div>
                          )}
                          {esEnCurso && (
                            <div className="small text-info mt-1">
                              <i className="bi bi-geo-alt-fill me-1" />En recorrido
                            </div>
                          )}
                        </td>

                        {/* FECHA */}
                        <td>
                          {reserva.fecha
                            ? new Date(
                                reserva.fecha
                              ).toLocaleString(
                                'es-CR'
                              )
                            : '—'}
                        </td>

                        {/* ACCIONES */}
                        <td className="text-end text-nowrap">

                          {!esSoporte &&
                            reserva.estado === 'confirmada' &&
                            !esPasada &&
                            !esEnCurso && (
                              <>
                                {/* EDITAR */}
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm me-2"
                                  onClick={() => {
                                    setEditando(reserva);
                                    window.scrollTo({
                                      top: 0,
                                      behavior: 'smooth',
                                    });
                                  }}
                                  title="Editar cupos reservados"
                                >
                                  <i className="bi bi-pencil me-1" />
                                  Editar
                                </button>

                                {/* CANCELAR PATCH */}
                                <button
                                  type="button"
                                  className="btn btn-outline-warning btn-sm me-2"
                                  onClick={() =>
                                    setConfirmacion({
                                      tipo: 'cancelar',
                                      reserva,
                                    })
                                  }
                                  title="Cancelar reserva"
                                >
                                  <i className="bi bi-x-circle me-1" />
                                  Cancelar
                                </button>

                                {/* DELETE */}
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() =>
                                    setConfirmacion({
                                      tipo: 'eliminar',
                                      reserva,
                                    })
                                  }
                                  title="Eliminar reserva"
                                >
                                  <i className="bi bi-trash me-1" />
                                  Eliminar
                                </button>
                              </>
                            )}

                          {/* Calificar si la reserva es de un viaje completado/pasado */}
                          {esPasada && viaje?.estado !== 'cancelado' && (
                            <button
                              type="button"
                              className="btn btn-outline-warning btn-sm text-dark d-inline-flex align-items-center gap-1"
                              onClick={() => navigate(`/calificaciones?viaje=${reserva.viaje}`)}
                              title="Calificar a los participantes de este viaje completado"
                            >
                              <i className="bi bi-star-fill text-warning" />
                              <span>Calificar</span>
                            </button>
                          )}

                          {/* Si el viaje está en curso */}
                          {esEnCurso && (
                            <span className="badge bg-info bg-opacity-25 text-dark small py-1 px-2">
                              <i className="bi bi-car-front-fill me-1" />En recorrido
                            </span>
                          )}

                          {reserva.estado === 'cancelada' && (
                            <span className="small text-secondary">
                              Cancelada
                            </span>
                          )}

                          {esSoporte &&
                            reserva.estado !== 'cancelada' && (
                              <span className="small text-secondary">
                                Solo lectura
                              </span>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══════════════════════════════════
              PAGINACIÓN
          ═══════════════════════════════════ */}

          {totalPaginas > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">

              <span className="small text-secondary">
                Página {pagina} de{' '}
                {totalPaginas}
              </span>

              <div className="btn-group">

                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={
                    pagina <= 1 ||
                    cargando
                  }
                  onClick={() =>
                    setPagina(
                      (actual) =>
                        actual - 1
                    )
                  }
                >
                  Anterior
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={
                    pagina >=
                      totalPaginas ||
                    cargando
                  }
                  onClick={() =>
                    setPagina(
                      (actual) =>
                        actual + 1
                    )
                  }
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

          {confirmacion && (
      <>
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">

              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-exclamation-triangle-fill text-warning me-2" />

                  {confirmacion.tipo === 'cancelar'
                    ? 'Cancelar reserva'
                    : 'Eliminar reserva'}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setConfirmacion(null)}
                />
              </div>

              <div className="modal-body">
                <p className="mb-2">
                  ¿Está seguro de que desea{' '}
                  <strong>
                    {confirmacion.tipo === 'cancelar'
                      ? 'cancelar'
                      : 'eliminar'}
                  </strong>{' '}
                  la reserva #{confirmacion.reserva.id}?
                </p>

                <p className="text-secondary small mb-0">
                  Los cupos asociados serán liberados
                  nuevamente en el viaje.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setConfirmacion(null)}
                >
                  Volver
                </button>

                <button
                  type="button"
                  className={
                    confirmacion.tipo === 'eliminar'
                      ? 'btn btn-danger'
                      : 'btn btn-warning'
                  }
                  onClick={confirmarAccion}
                >
                  {confirmacion.tipo === 'eliminar'
                    ? 'Eliminar'
                    : 'Cancelar reserva'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-backdrop fade show" />
      </>
    )}
    </>
  );
}
