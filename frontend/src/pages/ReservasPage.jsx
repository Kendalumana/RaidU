import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, getError } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

import FormReserva from '../components/FormReserva.jsx';

async function listReservas({ page = 1, estado = '', viaje = '' } = {}) {
  const params = { page };
  if (estado) params.estado = estado;
  if (viaje) params.viaje = viaje;

  const { data } = await api.get('/reservas/', { params });
  return {
    items: data.resultados ?? [],
    page: data.pagina_actual ?? page,
    totalPages: data.total_paginas ?? 1,
    total: data.total_registros ?? 0,
  };
}

async function listAllViajes() {
  const { data: firstPage } = await api.get('/viajes/', {
    params: { page: 1 },
  });

  const viajes = firstPage.resultados ?? [];
  const totalPages = firstPage.total_paginas ?? 1;

  if (totalPages <= 1) return viajes;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      api.get('/viajes/', { params: { page: index + 2 } })
    )
  );

  return [
    ...viajes,
    ...remainingPages.flatMap(({ data }) => data.resultados ?? []),
  ];
}

async function addReserva(reserva) {
  const { data } = await api.post('/reservas/', reserva);
  return data;
}

async function updateReserva(id, datos) {
  const { data } = await api.patch(`/reservas/${id}/`, datos);
  return data;
}

async function cancelReserva(id) {
  const { data } = await api.patch(`/reservas/${id}/`, {
    estado: 'cancelada',
  });
  return data;
}

async function deleteReserva(id) {
  await api.delete(`/reservas/${id}/`);
}

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
};

function formatoDinero(valor) {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function AccionesReserva({ reserva, onEditar, onCancelar, onEliminar, esSoporte }) {
  if (reserva.estado === 'cancelada') {
    return <span className="small text-secondary">Sin acciones</span>;
  }
  if (esSoporte) {
    return <span className="small text-secondary">Solo lectura</span>;
  }
  return (
    <div className="d-flex gap-1 justify-content-end flex-wrap">
      <button
        type="button"
        className="btn btn-outline-primary btn-sm"
        onClick={() => onEditar(reserva)}
        title="Editar reserva"
      >
        <i className="bi bi-pencil me-1" />
        Editar
      </button>
      <button
        type="button"
        className="btn btn-outline-warning btn-sm"
        onClick={() => onCancelar(reserva)}
        title="Cancelar reserva"
      >
        <i className="bi bi-x-circle me-1" />
        Cancelar
      </button>
      <button
        type="button"
        className="btn btn-outline-danger btn-sm"
        onClick={() => onEliminar(reserva)}
        title="Eliminar reserva"
      >
        <i className="bi bi-trash me-1" />
        Eliminar
      </button>
    </div>
  );
}

export default function ReservasPage() {
  const {
    user,
    esSoporte,
  } = useAuth();

  // ───────────────────────────────────────────
  // ESTADOS
  // ───────────────────────────────────────────
  const [reservas, setReservas] = useState([]);
  const [viajes, setViajes] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [cargandoViajes, setCargandoViajes] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState('');
  const [errorReservas, setErrorReservas] = useState('');
  const [exito, setExito] = useState('');

  const [editando, setEditando] = useState(null);

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const [filtros, setFiltros] = useState({
    estado: '',
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
  // CARGAR RESERVAS
  // ───────────────────────────────────────────
  const recargar = useCallback(async () => {
    setCargando(true);
    setErrorReservas('');

    try {
      const resultado = await listReservas({
        page: pagina,
        ...filtros,
      });

      setReservas(resultado.items);
      setPagina(resultado.page);
      setTotalPaginas(resultado.totalPages);
      setTotal(resultado.total);

    } catch (e) {
      setErrorReservas(getError(e));

    } finally {
      setCargando(false);
    }
  }, [pagina, filtros]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // ───────────────────────────────────────────
  // CARGAR VIAJES DISPONIBLES
  // ───────────────────────────────────────────
  const cargarViajesDisponibles = useCallback(async () => {
    setCargandoViajes(true);
    try {
      const lista = await listAllViajes();
      setViajes(lista);
    } catch (e) {
      setError(getError(e));
    } finally {
      setCargandoViajes(false);
    }
  }, []);

  useEffect(() => {
    cargarViajesDisponibles();
  }, [cargarViajesDisponibles]);

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

      await Promise.all([
        recargar(),
        cargarViajesDisponibles(),
      ]);

      return true;

    } catch (e) {
      const isConflict = e?.response?.status === 409;
      if (isConflict) {
        setError(
          'El cupo seleccionado ya fue ocupado por otro pasajero. Se ha actualizado la disponibilidad de cupos en el formulario.'
        );
        await cargarViajesDisponibles();
      } else {
        setError(getError(e));
      }
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

      await Promise.all([
        recargar(),
        cargarViajesDisponibles(),
      ]);

    } catch (e) {
      setError(getError(e));
    }
  };

  // ───────────────────────────────────────────
  // DELETE
  //
  // IMPORTANTE:
  // Django conserva la reserva como cancelada
  // para mantener el historial.
  // ───────────────────────────────────────────
  const eliminar = async (reserva) => {
    setError('');
    setExito('');

    try {
      await deleteReserva(reserva.id);

      setExito(
        `Reserva #${reserva.id} eliminada/cancelada correctamente.`
      );

      if (editando?.id === reserva.id) {
        setEditando(null);
      }

      await Promise.all([
        recargar(),
        cargarViajesDisponibles(),
      ]);

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

  const handleEditar = (reserva) => {
    setEditando(reserva);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelar = (reserva) => {
    setConfirmacion({ tipo: 'cancelar', reserva });
  };

  const handleEliminar = (reserva) => {
    setConfirmacion({ tipo: 'eliminar', reserva });
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
    if (filtros.estado || filtros.viaje) {
      return {
        titulo: 'No se encontraron reservas',
        texto:
          'No hay reservas que coincidan con los filtros seleccionados.',
      };
    }

    if (user?.rol === 'estudiante') {
      return {
        titulo: 'No tienes reservas',
        texto:
          'Cuando reserves un viaje, aparecerá en esta sección.',
      };
    }

    return {
      titulo: 'No hay reservas registradas',
      texto:
        'Actualmente no existen reservas en el sistema.',
    };
  }, [filtros, user]);


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
          cargandoViajes={cargandoViajes}
          userId={user?.id}
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

              {/* Estado */}
              <select
                className="form-select"
                name="estado"
                value={filtros.estado}
                onChange={actualizarFiltro}
                style={{ minWidth: 170 }}
              >
                <option value="">
                  Todos los estados
                </option>

                <option value="confirmada">
                  Confirmadas
                </option>

                <option value="cancelada">
                  Canceladas
                </option>
              </select>

              {/* Viaje */}
              <select
                className="form-select"
                name="viaje"
                value={filtros.viaje}
                onChange={actualizarFiltro}
                style={{ minWidth: 180 }}
              >
                <option value="">
                  Todos los viajes
                </option>

                {viajes.map((viaje) => (
                  <option
                    key={viaje.id}
                    value={viaje.id}
                  >
                    Viaje #{viaje.id}
                  </option>
                ))}
              </select>

              {(filtros.estado ||
                filtros.viaje) && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setFiltros({
                      estado: '',
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

          {/* LOADING / ERROR / EMPTY */}

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

          ) : errorReservas ? (

            <div className="text-center py-5">
              <div
                className="rounded-circle bg-danger bg-opacity-10 text-danger d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: 70, height: 70 }}
              >
                <i className="bi bi-exclamation-triangle-fill fs-2" />
              </div>

              <h3 className="h5 fw-bold text-danger">
                Error al cargar el historial de reservas
              </h3>

              <p className="text-secondary mb-3">
                {errorReservas}
              </p>

              <button
                type="button"
                className="btn btn-outline-danger btn-sm px-3"
                onClick={() => recargar()}
              >
                <i className="bi bi-arrow-clockwise me-1" />
                Reintentar historial
              </button>
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

            <>
              {/* VISTA MÓVIL (TARJETAS) */}
              <div className="d-md-none d-flex flex-column gap-3 mb-3">
                {reservas.map((reserva) => {
                  const viaje = viajesPorId[reserva.viaje];
                  return (
                    <div key={reserva.id} className="card border shadow-sm rounded-3">
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge text-bg-light border text-secondary">
                            Reserva #{reserva.id}
                          </span>
                          <span
                            className={`badge ${
                              estilosEstado[reserva.estado] || 'text-bg-secondary'
                            }`}
                          >
                            {reserva.estado}
                          </span>
                        </div>

                        <div className="fw-semibold mb-1">
                          Viaje #{reserva.viaje}
                        </div>
                        {viaje && (
                          <div className="small text-secondary mb-2">
                            {nombresSede[viaje.sede_origen] || viaje.sede_origen}
                            {' → '}
                            {nombresSede[viaje.sede_destino] || viaje.sede_destino}
                          </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center small text-secondary border-top pt-2 mt-2">
                          <div>
                            <i className="bi bi-person me-1" />Pasajero #{reserva.pasajero}
                          </div>
                          <div>
                            <span className="fw-semibold text-dark">{reserva.cupos} cupo{reserva.cupos > 1 ? 's' : ''}</span>
                            {' · '}
                            <span className="text-success fw-bold">{formatoDinero(reserva.monto_simulado)}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-top">
                          <AccionesReserva
                            reserva={reserva}
                            onEditar={handleEditar}
                            onCancelar={handleCancelar}
                            onEliminar={handleEliminar}
                            esSoporte={esSoporte}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* VISTA ESCRITORIO (TABLA) */}
              <div className="table-responsive d-none d-md-block">

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

                    return (
                      <tr key={reserva.id}>

                        {/* ID */}
                        <td className="text-secondary">
                          #{reserva.id}
                        </td>

                        {/* VIAJE */}
                        <td>
                          <div className="fw-semibold">
                            Viaje #{reserva.viaje}
                          </div>

                          {viaje && (
                            <small className="text-secondary">
                              {nombresSede[
                                viaje.sede_origen
                              ] ||
                                viaje.sede_origen}
                              {' → '}
                              {nombresSede[
                                viaje.sede_destino
                              ] ||
                                viaje.sede_destino}
                            </small>
                          )}
                        </td>

                        {/* PASAJERO */}
                        <td>
                          #{reserva.pasajero}
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
                                reserva.estado
                              ] ||
                              'text-bg-secondary'
                            }`}
                          >
                            {reserva.estado}
                          </span>
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
                          <AccionesReserva
                            reserva={reserva}
                            onEditar={handleEditar}
                            onCancelar={handleCancelar}
                            onEliminar={handleEliminar}
                            esSoporte={esSoporte}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
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
