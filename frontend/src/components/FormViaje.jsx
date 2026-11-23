export default function FormViaje({
  form,
  formErrors = {},
  editId = null,
  saving = false,
  misVehiculos = [],
  maxCupos = 5,
  sedes = [],
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <div className="card border-0 shadow-sm mb-4 border-top border-4 border-success">
      <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <div
            className="stat-icon"
            style={{ width: 38, height: 38, backgroundColor: '#ecfdf5', color: '#0f9d6b', fontSize: '1.05rem' }}
          >
            <i className={`bi ${editId ? 'bi-pencil-square' : 'bi-plus-circle'}`} aria-hidden="true" />
          </div>
          <div>
            <h5 className="fw-bold mb-0 text-dark">
              {editId ? 'Modificar datos del viaje' : 'Publicar un nuevo viaje'}
            </h5>
            <small className="text-secondary">
              Completá el vehículo, la ruta universitaria y el horario de salida.
            </small>
          </div>
        </div>
      </div>
      <div className="card-body p-4">
        <form onSubmit={onSubmit}>
          <div className="form-section-title">Información general y vehículo</div>
          <div className="row g-3 mb-4">
            <div className="col-12">
              <label htmlFor="nombre" className="form-label fw-semibold">Nombre del viaje (opcional)</label>
              <input id="nombre" name="nombre" className="form-control" maxLength={100} value={form.nombre} onChange={onChange} disabled={saving} placeholder="Ej: Viaje a la U por la mañana" />
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
                onChange={onChange}
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
                <span className="input-group-text">
                  <i className="bi bi-people-fill" aria-hidden="true" />
                </span>
                <input
                  id="cupos_totales"
                  name="cupos_totales"
                  type="number"
                  min={1}
                  max={maxCupos}
                  className={`form-control ${formErrors.cupos_totales ? 'is-invalid' : ''}`}
                  value={form.cupos_totales}
                  onChange={onChange}
                  disabled={saving}
                />
                <span className="input-group-text small">
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
                <span className="input-group-text fw-semibold">₡</span>
                <input
                  id="costo_total"
                  name="costo_total"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={`form-control ${formErrors.costo_total ? 'is-invalid' : ''}`}
                  value={form.costo_total}
                  onChange={onChange}
                  placeholder="Ej: 2500"
                  disabled={saving}
                />
                {formErrors.costo_total && (
                  <div className="invalid-feedback">{formErrors.costo_total}</div>
                )}
              </div>
              <div className="form-text">Monto total a compartir entre los pasajeros.</div>
            </div>
          </div>

          <div className="form-section-title">Ruta y horario</div>
          <div className="row g-3">
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
                onChange={onChange}
                disabled={saving}
              >
                <option value="">— Seleccione sede de salida —</option>
                {sedes.map((s) => (
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
                onChange={onChange}
                disabled={saving}
              >
                <option value="">— Seleccione sede de llegada —</option>
                {sedes.filter((s) => s.value !== form.sede_origen).map((s) => (
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
                onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
                disabled={saving}
              />
              {formErrors.fecha_hora && (
                <div className="invalid-feedback">{formErrors.fecha_hora}</div>
              )}
            </div>
          </div>

          {formErrors.non_field_errors && (
            <div className="alert alert-danger mt-3 py-2 d-flex align-items-center gap-2" role="alert">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0" aria-hidden="true" />
              <span>{formErrors.non_field_errors}</span>
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 mt-4 pt-3 border-top">
            <button type="submit" className="btn btn-success px-4" disabled={saving}>
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
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
