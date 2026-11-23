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

export default function FormReserva({
  reserva,
  viajes,
  cargandoViajes = false,
  userId,
  onSave,
  onCancel,
  saving,
}) {
  const [form, setForm] = useState(initial);

  // Viajes que realmente pueden reservarse.
  const viajesDisponibles = useMemo(() => {
    return viajes.filter((viaje) => {
      const esPropio =
        userId &&
        Number(viaje.conductor) === Number(userId);

      return (
        viaje.estado === 'publicado' &&
        viaje.cupos_disponibles > 0 &&
        !esPropio
      );
    });
  }, [viajes, userId]);

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

  // Al editar se pueden usar los cupos actuales +
  // los que todavía estén disponibles.
  const maxCupos = reserva
    ? Number(reserva.cupos) +
      Number(viajeSeleccionado?.cupos_disponibles || 0)
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
                ? 'Modifique la cantidad de cupos reservados.'
                : 'Seleccione un viaje disponible y la cantidad de cupos.'}
            </small>
          </div>
        </div>

        {cargandoViajes ? (
          <div className="alert alert-info py-2 d-flex align-items-center mb-3">
            <span className="spinner-border spinner-border-sm me-2" role="status" />
            <span>Cargando viajes disponibles...</span>
          </div>
        ) : !reserva && viajesDisponibles.length === 0 ? (
          <div className="alert alert-warning py-2 mb-3">
            <i className="bi bi-exclamation-triangle me-2" />
            No hay viajes disponibles para reservar en este momento.
          </div>
        ) : null}

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
                disabled={Boolean(reserva) || cargandoViajes || saving}
                required
              >
                <option value="">
                  {cargandoViajes ? 'Cargando viajes disponibles...' : 'Seleccione un viaje...'}
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
                    #{viaje.id} ·{' '}
                    {nombresSede[viaje.sede_origen] ||
                      viaje.sede_origen}
                    {' → '}
                    {nombresSede[viaje.sede_destino] ||
                      viaje.sede_destino}
                    {' · '}
                    {viaje.cupos_disponibles} cupos
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
                <small className="text-secondary">
                  Disponibles: {maxCupos}
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
                cargandoViajes ||
                !form.viaje ||
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