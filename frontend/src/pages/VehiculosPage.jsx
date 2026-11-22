import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';

const VACIO = { placa: '', marca: '', modelo: '', capacidad: 1 };

export default function VehiculosPage() {
  const { user, esAdmin } = useAuth();

  /* ── estado de listado ── */
  const [vehiculos, setVehiculos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  /* ── estado de formulario ── */
  const [form, setForm] = useState({ ...VACIO });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  /* ── cargar lista de vehículos ── */
  const cargar = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: p });
      if (q.trim()) params.set('search', q.trim());
      const { data } = await api.get(`/vehiculos/?${params}`);
      setVehiculos(data.results || []);
      setPage(data.page || p);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    cargar();
  }, []);

  /* ── helpers formulario ── */
  const change = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'capacidad' ? Number(value) : value,
    }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const abrirCrear = () => {
    setForm({ ...VACIO });
    setEditId(null);
    setShowForm(true);
    setFormErrors({});
  };

  const abrirEditar = (v) => {
    setForm({
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      capacidad: v.capacidad,
    });
    setEditId(v.id);
    setShowForm(true);
    setFormErrors({});
  };

  const cancelar = () => {
    setShowForm(false);
    setEditId(null);
    setFormErrors({});
  };

  /* ── validación frontend ── */
  const validar = () => {
    const errs = {};
    if (!form.placa.trim()) errs.placa = 'La placa es obligatoria.';
    else if (form.placa.trim().length > 15) errs.placa = 'Máximo 15 caracteres.';

    if (!form.marca.trim()) errs.marca = 'La marca es obligatoria.';
    if (!form.modelo.trim()) errs.modelo = 'El modelo es obligatorio.';

    if (!form.capacidad || form.capacidad < 1 || form.capacidad > 5) {
      errs.capacidad = 'La capacidad debe estar entre 1 y 5 pasajeros.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── guardar (crear / editar) ── */
  const guardar = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const payload = {
        placa: form.placa.trim().toUpperCase(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        capacidad: form.capacidad,
      };
      if (editId) {
        await api.patch(`/vehiculos/${editId}/`, payload);
        setMsg('Vehículo actualizado exitosamente.');
      } else {
        await api.post('/vehiculos/', payload);
        setMsg('Vehículo registrado exitosamente.');
      }
      cancelar();
      cargar(editId ? page : 1);
    } catch (err) {
      if (err.response?.status === 400 && typeof err.response.data === 'object') {
        const fieldErrs = {};
        Object.entries(err.response.data).forEach(([k, v]) => {
          fieldErrs[k] = Array.isArray(v) ? v.join(' ') : v;
        });
        setFormErrors(fieldErrs);
      } else {
        setError(getError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── eliminar vehículo ── */
  const eliminar = async (v) => {
    if (!window.confirm(`¿Está seguro de eliminar el vehículo "${v.placa}"? Los viajes asociados impedirán su eliminación.`)) {
      return;
    }
    setMsg('');
    setError('');
    try {
      await api.delete(`/vehiculos/${v.id}/`);
      setMsg(`Vehículo ${v.placa} eliminado exitosamente.`);
      cargar(page);
    } catch (err) {
      setError(getError(err));
    }
  };

  /* ── búsqueda ── */
  const handleSearch = (e) => {
    e.preventDefault();
    cargar(1, search);
  };

  return (
    <>
      {/* ── Encabezado ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">
            <i className="bi bi-truck me-2 text-primary" />
            {esAdmin ? 'Gestión de Vehículos' : 'Mis Vehículos'}
          </h1>
          <p className="text-secondary small mb-0">
            {esAdmin
              ? 'Administre todos los vehículos registrados en la plataforma RaidU'
              : 'Registre y administre sus vehículos para ofrecer viajes compartidos'}
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary shadow-sm" onClick={abrirCrear}>
            <i className="bi bi-plus-lg me-1" />Registrar vehículo
          </button>
        )}
      </div>

      {/* ── Notificaciones ── */}
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

      {/* ── Formulario crear/editar ── */}
      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom py-3">
            <h5 className="fw-bold mb-0 text-primary">
              <i className={`bi ${editId ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`} />
              {editId ? 'Editar información del vehículo' : 'Registrar nuevo vehículo'}
            </h5>
          </div>
          <div className="card-body p-4">
            <form onSubmit={guardar}>
              <div className="row g-3">
                <div className="col-md-6 col-lg-3">
                  <label htmlFor="placa" className="form-label fw-semibold">
                    Placa <span className="text-danger">*</span>
                  </label>
                  <input
                    id="placa"
                    name="placa"
                    className={`form-control ${formErrors.placa ? 'is-invalid' : ''}`}
                    value={form.placa}
                    onChange={change}
                    maxLength={15}
                    placeholder="Ej: ABC-123"
                    disabled={saving}
                  />
                  {formErrors.placa && <div className="invalid-feedback">{formErrors.placa}</div>}
                  <div className="form-text">Máximo 15 caracteres alfanuméricos.</div>
                </div>

                <div className="col-md-6 col-lg-3">
                  <label htmlFor="marca" className="form-label fw-semibold">
                    Marca <span className="text-danger">*</span>
                  </label>
                  <input
                    id="marca"
                    name="marca"
                    className={`form-control ${formErrors.marca ? 'is-invalid' : ''}`}
                    value={form.marca}
                    onChange={change}
                    maxLength={60}
                    placeholder="Ej: Toyota"
                    disabled={saving}
                  />
                  {formErrors.marca && <div className="invalid-feedback">{formErrors.marca}</div>}
                </div>

                <div className="col-md-6 col-lg-3">
                  <label htmlFor="modelo" className="form-label fw-semibold">
                    Modelo <span className="text-danger">*</span>
                  </label>
                  <input
                    id="modelo"
                    name="modelo"
                    className={`form-control ${formErrors.modelo ? 'is-invalid' : ''}`}
                    value={form.modelo}
                    onChange={change}
                    maxLength={60}
                    placeholder="Ej: Corolla 2022"
                    disabled={saving}
                  />
                  {formErrors.modelo && <div className="invalid-feedback">{formErrors.modelo}</div>}
                </div>

                <div className="col-md-6 col-lg-3">
                  <label htmlFor="capacidad" className="form-label fw-semibold">
                    Capacidad (pasajeros) <span className="text-danger">*</span>
                  </label>
                  <input
                    id="capacidad"
                    name="capacidad"
                    type="number"
                    min={1}
                    max={5}
                    className={`form-control ${formErrors.capacidad ? 'is-invalid' : ''}`}
                    value={form.capacidad}
                    onChange={change}
                    disabled={saving}
                  />
                  {formErrors.capacidad && <div className="invalid-feedback">{formErrors.capacidad}</div>}
                  <div className="form-text">Entre 1 y 5 asientos para pasajeros (no incluye conductor).</div>
                </div>
              </div>

              {formErrors.non_field_errors && (
                <div className="alert alert-danger mt-3 py-2">{formErrors.non_field_errors}</div>
              )}

              <div className="d-flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1" />
                      {editId ? 'Guardar cambios' : 'Registrar vehículo'}
                    </>
                  )}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={cancelar} disabled={saving}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Búsqueda ── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <form onSubmit={handleSearch} className="row g-2 align-items-center">
            <div className="col-12 col-md-8 col-lg-9">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Buscar por placa, marca o modelo…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="btn btn-outline-secondary border-start-0"
                    type="button"
                    onClick={() => {
                      setSearch('');
                      cargar(1, '');
                    }}
                    title="Limpiar búsqueda"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            </div>
            <div className="col-12 col-md-4 col-lg-3 d-flex gap-2">
              <button className="btn btn-outline-primary flex-grow-1" type="submit">
                <i className="bi bi-search me-1" />Buscar
              </button>
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    setSearch('');
                    cargar(1, '');
                  }}
                >
                  Restablecer
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ── Listado ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-secondary">Cargando vehículos…</p>
        </div>
      ) : vehiculos.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
              <i className="bi bi-truck text-secondary fs-1" />
            </div>
            <h5 className="fw-semibold text-secondary">
              {search ? 'No se encontraron vehículos' : 'No hay vehículos registrados'}
            </h5>
            <p className="text-muted small mb-3">
              {search
                ? 'Intente buscar con otros términos o limpie el filtro de búsqueda.'
                : 'Registre su vehículo para poder publicar viajes y compartir gastos con la comunidad universitaria.'}
            </p>
            {!search && (
              <button className="btn btn-primary btn-sm" onClick={abrirCrear}>
                <i className="bi bi-plus-lg me-1" />Registrar mi primer vehículo
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2 px-1">
            <span className="text-secondary small">
              Total: <strong>{totalCount}</strong> vehículo{totalCount !== 1 ? 's' : ''}
            </span>
            <span className="badge bg-light text-secondary border">Página {page} de {totalPages}</span>
          </div>

          {/* Cards en móvil */}
          <div className="d-md-none">
            {vehiculos.map((v) => (
              <div key={v.id} className="card border-0 shadow-sm mb-3">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fw-bold fs-5 text-primary">{v.placa}</span>
                        <span className={`badge ${v.activo ? 'bg-success' : 'bg-secondary'}`}>
                          {v.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-secondary mb-1">
                        {v.marca} — {v.modelo}
                      </p>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                    <span className="badge bg-primary bg-opacity-10 text-primary">
                      <i className="bi bi-person-fill me-1" />
                      {v.capacidad} pasajero{v.capacidad !== 1 ? 's' : ''}
                    </span>
                    {esAdmin && (
                      <span className="text-muted small">
                        Prop: #{v.propietario}
                      </span>
                    )}
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => abrirEditar(v)}
                        title="Editar vehículo"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => eliminar(v)}
                        title="Eliminar vehículo"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla en escritorio */}
          <div className="d-none d-md-block">
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Placa</th>
                      <th>Marca</th>
                      <th>Modelo</th>
                      <th className="text-center">Capacidad</th>
                      {esAdmin && <th className="text-center">Propietario ID</th>}
                      <th className="text-center">Estado</th>
                      <th className="text-center pe-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiculos.map((v) => (
                      <tr key={v.id}>
                        <td className="ps-4">
                          <span className="fw-bold text-primary">{v.placa}</span>
                        </td>
                        <td>{v.marca}</td>
                        <td>{v.modelo}</td>
                        <td className="text-center">
                          <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
                            <i className="bi bi-person-fill me-1" />
                            {v.capacidad} {v.capacidad === 1 ? 'asiento' : 'asientos'}
                          </span>
                        </td>
                        {esAdmin && (
                          <td className="text-center">
                            <span className="badge bg-secondary">Usuario #{v.propietario}</span>
                          </td>
                        )}
                        <td className="text-center">
                          <span className={`badge ${v.activo ? 'bg-success' : 'bg-secondary'}`}>
                            {v.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="text-center pe-4">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => abrirEditar(v)}
                              title="Editar vehículo"
                            >
                              <i className="bi bi-pencil me-1" />Editar
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => eliminar(v)}
                              title="Eliminar vehículo"
                            >
                              <i className="bi bi-trash me-1" />Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Paginación ── */}
          {totalPages > 1 && (
            <nav className="mt-4 d-flex justify-content-center" aria-label="Navegación de páginas">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => cargar(page - 1)}
                    disabled={page <= 1}
                    aria-label="Página anterior"
                  >
                    <i className="bi bi-chevron-left me-1" />Anterior
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => cargar(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => cargar(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Página siguiente"
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
