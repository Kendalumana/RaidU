import { useEffect, useMemo, useState } from 'react';

const initial = {
  viaje: '',
  cupos: '',
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
  cargandoViajes = false,
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
        cupos: '',
      });
    }
  }, [reserva]);

  const viajeSeleccionado = viajes.find(
    (viaje) => Number(viaje.id) === Number(form.viaje)
  );

  const maxCupos = Number(reserva?.cupos || 0) + Number(viajeSeleccionado?.cupos_disponibles || 0);

  const change = ({ target }) => {
    const { name, value } = target;

    setForm((actual) => {
      if (name === 'viaje' && !reserva) {
        const viaje = viajes.find((item) => Number(item.id) === Number(value));
        const maximo = Number(viaje?.cupos_disponibles || 1);
        const cuposActuales = Number(actual.cupos) || 1;
        return {
          ...actual,
          viaje: value,
          cupos: Math.min(cuposActuales, maximo),
        };
      }

      return { ...actual, [name]: value };
    });
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
    <section className="card border-0 shadow-sm rounded-4 mb-4 border-top border-4 border-primary">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-3">
        <div
          className="stat-icon"
          style={{ width: 40, height: 40, backgroundColor: 'var(--raidu-primary-light)', color: 'var(--raidu-primary)', fontSize: '1.1rem' }}
        >
          <i className={`bi ${reserva ? 'bi-pencil-square' : 'bi-bookmark-plus'}`} aria-hidden="true" />
        </div>

        <div>
          <h2 className="h5 fw-bold mb-0">
            {reserva
              ? `Editar reserva #${reserva.id}`
              : 'Nueva reserva'}
          </h2>

          <small className="text-secondary">
            {reserva
              ? 'Modifique la cantidad de cupos de su reserva.'
              : 'Seleccione un viaje disponible y la cantidad de cupos.'}
          </small>
        </div>
      </div>

      <div className="card-body p-4">
        {cargandoViajes ? (
          <div className="alert alert-info py-2 d-flex align-items-center mb-3" role="status">
            <span className="spinner-border spinner-border-sm me-2" role="status" />
            <span>Cargando viajes disponibles...</span>
          </div>
        ) : !reserva && viajesDisponibles.length === 0 ? (
          <div className="alert alert-warning py-2 d-flex align-items-center gap-2 mb-3" role="status">
            <i className="bi bi-exclamation-triangle-fill flex-shrink-0" aria-hidden="true" />
            <span>No hay viajes disponibles para reservar en este momento.</span>
          </div>
        ) : null}

        <form onSubmit={submit}>
          <div className="form-section-title">Selección de viaje y cupos</div>
          <div className="row g-3">

            {/* VIAJE */}
            <div className="col-md-8">
              <label
                className="form-label fw-semibold"
                htmlFor="reserva-viaje"
              >
                Viaje <span className="text-danger">*</span>
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
                Cupos <span className="text-danger">*</span>
              </label>

              <select
                id="reserva-cupos"
                name="cupos"
                className="form-select"
                value={form.cupos}
                onChange={change}
                disabled={!viajeSeleccionado || saving || cargandoViajes}
                required
              >
                {!viajeSeleccionado && <option value="">Seleccione un viaje primero</option>}
                {viajeSeleccionado && Array.from({ length: maxCupos }, (_, index) => index + 1).map((cantidad) => (
                  <option key={cantidad} value={cantidad}>
                    {cantidad} {cantidad === 1 ? 'cupo' : 'cupos'}
                  </option>
                ))}
              </select>

              {viajeSeleccionado && (
                <small className="form-text d-block mt-1">
                  {reserva
                    ? `${reserva.cupos} reservados + ${viajeSeleccionado.cupos_disponibles} libres = máximo ${maxCupos}`
                    : `Disponibles en viaje: ${maxCupos}`}
                </small>
              )}
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 mt-4 pt-3 border-top">
            <button
              type="submit"
              className="btn btn-primary px-4"
              disabled={
                saving ||
                cargandoViajes ||
                !form.viaje ||
                (!reserva &&
                  viajesDisponibles.length === 0)
              }
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-1" aria-hidden="true" />
                  {reserva ? 'Guardar cambios' : 'Crear reserva'}
                </>
              )}
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
