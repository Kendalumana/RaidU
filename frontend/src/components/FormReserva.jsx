import { useEffect, useMemo, useState } from 'react';

const initial = {
  viaje: '',
  cupos: 1,
};

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

export default function FormReserva({
  reserva,
  viajes,
  userId,
  viajesReservadosIds = new Set(),
  onSave,
  onCancel,
  saving,
}) {
  const [form, setForm] = useState(initial);

  // Viajes que realmente pueden reservarse (ordenados por fecha).
  // Se excluyen:
  // - Viajes pasados (cuya fecha_hora ya ocurrió)
  // - Viajes propios (conducidos por el usuario)
  // - Viajes donde el usuario ya tiene reserva registrada (confirmada o cancelada)
  const viajesDisponibles = useMemo(() => {
    const ahora = new Date();
    return viajes
      .filter((viaje) => {
        const esPropio =
          userId &&
          Number(viaje.conductor) === Number(userId);

        const yaTieneReserva = viajesReservadosIds.has(Number(viaje.id));
        const esPasado = new Date(viaje.fecha_hora) <= ahora;

        return (
          viaje.estado === 'publicado' &&
          viaje.cupos_disponibles > 0 &&
          !esPropio &&
          !yaTieneReserva &&
          !esPasado
        );
      })
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
  }, [viajes, userId, viajesReservadosIds]);

  useEffect(() => {
    if (reserva) {
      setForm({
        viaje: String(reserva.viaje),
        cupos: reserva.cupos,
      });
    } else {
      setForm({
        viaje: '',
        cupos: 1,
      });
    }
  }, [reserva]);

  const viajeSeleccionado = viajes.find(
    (viaje) => Number(viaje.id) === Number(form.viaje)
  );

  // Al editar: restrictivo, solo se permite mantener o reducir cupos previamente reservados
  // Al crear: el tope son los cupos disponibles actuales del viaje
  const maxCupos = reserva
    ? Number(reserva.cupos)
    : Number(viajeSeleccionado?.cupos_disponibles || 1);

  const change = ({ target }) => {
    const { name, value } = target;

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const datos = {
      viaje: Number(form.viaje),
      cupos: Number(form.cupos),
    };

    const saved = await onSave(datos);

    if (saved && !reserva) {
      setForm({ ...initial });
    }
  };

  return (
    <section className="card border-0 shadow-sm rounded-4 mb-4">
      <div className="card-body p-4">

        <div className="d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-bookmark-plus text-primary fs-4" />

          <div>
            <h2 className="h5 fw-bold mb-0">
              {reserva
                ? `Editar reserva #${reserva.id}`
                : 'Nueva reserva'}
            </h2>

            <small className="text-secondary">
              {reserva
                ? `Modifique la cantidad de cupos (máximo sus ${reserva.cupos} cupos reservados actuales; solo puede mantener o liberar cupos).`
                : 'Seleccione un viaje disponible y la cantidad de cupos.'}
            </small>
          </div>
        </div>

        {!reserva && viajesDisponibles.length === 0 && (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2" />
            No hay viajes disponibles para reservar en este momento.
          </div>
        )}

        <form onSubmit={submit}>
          <div className="row g-3">

            {/* VIAJE */}
            <div className="col-md-8">
              <label
                className="form-label fw-semibold"
                htmlFor="reserva-viaje"
              >
                Viaje *
              </label>

              <select
                id="reserva-viaje"
                name="viaje"
                className="form-select"
                value={form.viaje}
                onChange={change}
                disabled={Boolean(reserva)}
                required
              >
                <option value="">
                  Seleccione un viaje...
                </option>

                {(reserva
                  ? viajes.filter(
                      (v) =>
                        Number(v.id) === Number(reserva.viaje)
                    )
                  : viajesDisponibles
                ).map((viaje) => (
                  <option
                    key={viaje.id}
                    value={viaje.id}
                  >
                    {viaje.nombre ? `${viaje.nombre} — ` : ''}
                    #{viaje.id} · {formatFechaCorta(viaje.fecha_hora)} ·{' '}
                    {nombresSede[viaje.sede_origen] ||
                      viaje.sede_origen}
                    {' → '}
                    {nombresSede[viaje.sede_destino] ||
                      viaje.sede_destino}
                    {' · '}
                    {viaje.cupos_disponibles} cupos libres
                  </option>
                ))}
              </select>
            </div>

            {/* CUPOS */}
            <div className="col-md-4">
              <label
                className="form-label fw-semibold"
                htmlFor="reserva-cupos"
              >
                Cupos *
              </label>

              <input
                id="reserva-cupos"
                name="cupos"
                type="number"
                min="1"
                max={maxCupos}
                className="form-control"
                value={form.cupos}
                onChange={change}
                required
              />

              {viajeSeleccionado && (
                <small className="text-secondary d-block mt-1">
                  {reserva
                    ? `Tope permitido: ${maxCupos} cupo(s) (solo reducción)`
                    : `Disponibles en viaje: ${maxCupos}`}
                </small>
              )}
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                saving ||
                (!reserva &&
                  viajesDisponibles.length === 0)
              }
            >
              <i className="bi bi-save me-2" />

              {saving
                ? 'Guardando...'
                : reserva
                  ? 'Guardar cambios'
                  : 'Crear reserva'}
            </button>

            {reserva && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={saving}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
