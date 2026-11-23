import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';
import { Link } from 'react-router-dom';
import { canAccessUsers, canDeactivateUser } from '../auth/sessionPolicy.js';

export default function UsuariosPage() {
  const { user: currentUser, esAdmin } = useAuth();
  const puedeListar = canAccessUsers(currentUser);

  /* ── Estado de listado ── */
  const [usuarios, setUsuarios] = useState([]);
  const ultimaConsulta = useRef(0);
  const [vehiculosPorUsuario, setVehiculosPorUsuario] = useState({});
  const [erroresVehiculosUsuario, setErroresVehiculosUsuario] = useState({});
  const [cargandoVehiculosUsuario, setCargandoVehiculosUsuario] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  /* ── Filtros y búsqueda ── */
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'activo', 'inactivo'
  const [filtroRol, setFiltroRol] = useState('todos'); // 'todos', 'admin', 'soporte', 'estudiante'
  const [filtroCorreo, setFiltroCorreo] = useState('todos'); // 'todos', 'institucional', 'no_institucional'

  /* ── Usuario expandido para ver vehículos ── */
  const [expandedUserId, setExpandedUserId] = useState(null);

  /* ═══ Cargar usuarios y catálogo de vehículos para correlación ═══ */
  const cargar = useCallback(
    async () => {
      const consulta = ++ultimaConsulta.current;
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/usuarios/', {
          params: { page, search: search.trim(), estado: filtroEstado, rol: filtroRol, correo: filtroCorreo },
        });
        if (consulta !== ultimaConsulta.current) return;
        setUsuarios(data.results);
        setTotalCount(data.count);
      } catch (err) {
        if (consulta !== ultimaConsulta.current) return;
        if (err.response?.status === 404 && page > 1) setPage(page - 1);
        else setError(getError(err));
      } finally {
        if (consulta === ultimaConsulta.current) setLoading(false);
      }
    },
    [page, search, filtroEstado, filtroRol, filtroCorreo]
  );

  useEffect(() => {
    if (puedeListar) cargar();
  }, [cargar, puedeListar]);

  /* ═══ Mapa de vehículos agrupados por ID de propietario ═══ */
  const cargarVehiculosUsuario = async (userId) => {
    setCargandoVehiculosUsuario(userId);
    setErroresVehiculosUsuario((prev) => ({ ...prev, [userId]: '' }));

    try {
      const vehiculosActivos = [];
      let pagina = 1;
      let paginas;
      do {
        const { data } = await api.get('/vehiculos/', { params: { propietario: userId, activo: 'true', page: pagina } });
        vehiculosActivos.push(...data.results);
        paginas = data.total_pages;
        pagina++;
      } while (pagina <= paginas);
      setVehiculosPorUsuario((prev) => ({ ...prev, [userId]: vehiculosActivos }));
    } catch (err) {
      setErroresVehiculosUsuario((prev) => ({ ...prev, [userId]: getError(err) }));
    } finally {
      setCargandoVehiculosUsuario(null);
    }
  };

  const toggleVehiculos = (usuario) => {
    if (cargandoVehiculosUsuario !== null) return;

    const yaExpandido = expandedUserId === usuario.id;
    setExpandedUserId(yaExpandido ? null : usuario.id);

    const yaCargados = Object.prototype.hasOwnProperty.call(vehiculosPorUsuario, usuario.id);
    if (!yaExpandido && !yaCargados) cargarVehiculosUsuario(usuario.id);
  };

  const renderDetalleVehiculos = (usuario) => {
    if (cargandoVehiculosUsuario === usuario.id) {
      return <span className="text-muted">Cargando vehículos...</span>;
    }

    if (erroresVehiculosUsuario[usuario.id]) {
      return (
        <div>
          <span className="text-danger d-block mb-2">No se pudo cargar el detalle: {erroresVehiculosUsuario[usuario.id]}</span>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => cargarVehiculosUsuario(usuario.id)}
            disabled={cargandoVehiculosUsuario !== null}
          >
            Reintentar
          </button>
        </div>
      );
    }

    const vehiculosUsuario = vehiculosPorUsuario[usuario.id];
    if (!vehiculosUsuario) return null;
    if (vehiculosUsuario.length === 0) {
      return <span className="text-muted fst-italic">Sin vehículos activos registrados.</span>;
    }

    return (
      <ul className="list-unstyled mb-0">
        {vehiculosUsuario.map((vehiculo) => (
          <li key={vehiculo.id} className="py-1 border-bottom border-secondary border-opacity-10">
            <strong>{vehiculo.placa}</strong> - {vehiculo.marca} {vehiculo.modelo} ({vehiculo.capacidad} asientos)
          </li>
        ))}
      </ul>
    );
  };

  /* ═══ Desactivar cuenta de usuario (DELETE /usuarios/<pk>/) ═══ */
  const desactivar = async (u) => {
    const advertencia =
      u.email.toLowerCase().endsWith('@ucr.ac.cr')
        ? `¿Desactivar la cuenta de "${u.email}" (ID #${u.id})?\n\nEl usuario perderá el acceso a la plataforma de inmediato y sus tokens serán revocados.`
        : `¡ATENCIÓN! La cuenta "${u.email}" no utiliza un correo institucional @ucr.ac.cr.\n\n¿Desea desactivar y revocar esta cuenta inmediatamente?`;

    if (!window.confirm(advertencia)) return;

    setMsg('');
    setError('');
    try {
      await api.delete(`/usuarios/${u.id}/`);
      setMsg(`La cuenta de "${u.email}" ha sido desactivada exitosamente.`);
      await cargar();
    } catch (err) {
      setError(getError(err));
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / 10));

  /* Defensa adicional: Django permite lectura a Admin y Soporte. */
  if (!puedeListar) {
    return (
      <div className="card border-0 shadow-sm border-start border-4 border-danger">
        <div className="card-body p-5 text-center">
          <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-inline-flex p-4 mb-3">
            <i className="bi bi-shield-x fs-1" />
          </div>
          <h3 className="h4 fw-bold text-danger">Acceso Restringido</h3>
          <p className="text-secondary max-w-md mx-auto mb-4">
            El listado de usuarios requiere rol de Administrador o Soporte.
          </p>
          <Link to="/" className="btn btn-primary">
            <i className="bi bi-arrow-left me-1" />Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Encabezado ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="h3 fw-bold mb-0">
              <i className="bi bi-people-fill me-2 text-danger" />{esAdmin ? 'Gestión y Moderación de Usuarios' : 'Consulta de Usuarios'}
            </h1>
            <span className={`badge text-uppercase px-2 py-1 ${esAdmin ? 'bg-danger' : 'bg-warning text-dark'}`}>
              {esAdmin ? 'Administrador' : 'Solo lectura'}
            </span>
          </div>
          <p className="text-secondary small mb-0">
            {esAdmin ? 'Administre cuentas universitarias, revise vehículos asociados y desactive cuentas no autorizadas' : 'Consulte las cuentas universitarias. Su rol no permite desactivar usuarios.'}
          </p>
        </div>

        <button className="btn btn-outline-primary btn-sm" onClick={cargar} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1" />Actualizar listado
        </button>
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
        <div className="alert alert-danger alert-dismissible fade show py-2 d-flex flex-wrap align-items-center gap-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-5" />
          <div className="flex-grow-1">{error}</div>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={cargar} disabled={loading}>
            Reintentar
          </button>
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Cerrar" />
        </div>
      )}

      {/* ── Barra de búsqueda y filtros ── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Buscador de texto */}
            <div className="col-12 col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por nombre, apellidos o correo institucional…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                {search && (
                  <button className="btn btn-outline-secondary" type="button" onClick={() => { setSearch(''); setPage(1); }}>
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro por estado */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setPage(1);
                }}
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Solo Activos</option>
                <option value="inactivo">Solo Inactivos</option>
              </select>
            </div>

            {/* Filtro por rol */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={filtroRol}
                onChange={(e) => {
                  setFiltroRol(e.target.value);
                  setPage(1);
                }}
              >
                <option value="todos">Todos los roles</option>
                <option value="estudiante">Estudiantes</option>
                <option value="soporte">Soporte</option>
                <option value="admin">Administradores</option>
              </select>
            </div>

            {/* Filtro institucional para moderación */}
            <div className="col-12 col-md-3">
              <select
                className="form-select form-select-sm"
                value={filtroCorreo}
                onChange={(e) => {
                  setFiltroCorreo(e.target.value);
                  setPage(1);
                }}
              >
                <option value="todos">Cualquier dominio de correo</option>
                <option value="institucional">Institucional (@ucr.ac.cr)</option>
                <option value="no_institucional">Externo / No autorizado ⚠️</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Listado de usuarios ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status" />
          <p className="mt-2 text-secondary">Cargando usuarios registrados…</p>
        </div>
      ) : usuarios.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-people text-secondary fs-1 mb-2 d-block" />
            <h5 className="fw-semibold text-secondary">No se encontraron usuarios</h5>
            <p className="text-muted small mb-0">
              No hay usuarios que coincidan con la búsqueda y los filtros aplicados.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2 px-1">
            <span className="text-secondary small">
              Mostrando <strong>{usuarios.length}</strong> de <strong>{totalCount}</strong> usuarios coincidentes
            </span>
            <span className="badge bg-light text-secondary border">Página {page} de {totalPages}</span>
          </div>

          {/* Cards responsivas para móvil */}
          <div className="d-md-none">
            {usuarios.map((u) => {
              const totalVehiculos = u.cantidad_vehiculos;
              const esInstitucional = u.email && u.email.toLowerCase().endsWith('@ucr.ac.cr');
              const isExpanded = expandedUserId === u.id;

              return (
                <div key={u.id} className="card border-0 shadow-sm mb-3">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="d-flex align-items-center gap-1 mb-1">
                          <span className="fw-bold text-dark">
                            {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                          </span>
                          <span className="text-muted small">#{u.id}</span>
                        </div>
                        <div className="small text-secondary mb-1">
                          {u.email}
                          {!esInstitucional && (
                            <span className="badge bg-warning text-dark ms-1" title="Correo no institucional">
                              ⚠️ No UCR
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`badge ${u.activo ? 'bg-success' : 'bg-secondary'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top small text-secondary">
                      <span>Rol: <strong className="text-uppercase">{u.rol || 'Estudiante'}</strong></span>
                      <button
                        className="btn btn-outline-primary btn-sm py-0 px-2"
                        onClick={() => toggleVehiculos(u)}
                        disabled={cargandoVehiculosUsuario !== null}
                      >
                        <i className="bi bi-car-front me-1" />
                        {cargandoVehiculosUsuario === u.id
                          ? 'Cargando...'
                          : `${totalVehiculos ?? '-'} vehículo${totalVehiculos !== 1 ? 's' : ''}`}
                      </button>
                    </div>

                    {/* Detalle de vehículos expandible */}
                    {isExpanded && (
                      <div className="mt-2 p-2 bg-light rounded border small">
                        <strong className="d-block mb-1 text-primary">Vehículos asociados:</strong>
                        {renderDetalleVehiculos(u)}
                      </div>
                    )}

                    {/* Acciones */}
                    {canDeactivateUser(currentUser, u) && (
                      <div className="mt-3 pt-2 border-top text-end">
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => desactivar(u)}
                        >
                          <i className="bi bi-person-x me-1" />Desactivar cuenta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla de escritorio */}
          <div className="d-none d-md-block">
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">ID</th>
                      <th>Usuario / Correo</th>
                      <th>Nombre completo</th>
                      <th>Teléfono</th>
                      <th>Rol</th>
                      <th className="text-center">Vehículos Asociados</th>
                      <th className="text-center">Estado</th>
                      <th className="text-center pe-4">Acción de Moderación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => {
                      const totalVehiculos = u.cantidad_vehiculos;
                      const esInstitucional = u.email && u.email.toLowerCase().endsWith('@ucr.ac.cr');
                      const isExpanded = expandedUserId === u.id;

                      return (
                        <tr key={u.id}>
                          <td className="ps-4 fw-bold text-muted">#{u.id}</td>
                          <td>
                            <div className="fw-semibold text-dark">{u.email}</div>
                            {!esInstitucional ? (
                              <span className="badge bg-warning text-dark small" title="Dominio no autorizado">
                                ⚠️ No institucional
                              </span>
                            ) : (
                              <span className="text-muted small">@ucr.ac.cr</span>
                            )}
                          </td>
                          <td>
                            {u.first_name || u.last_name ? (
                              <span>{u.first_name} {u.last_name}</span>
                            ) : (
                              <span className="text-muted fst-italic">Sin nombre registrado</span>
                            )}
                          </td>
                          <td>
                            <span className="text-secondary small">{u.telefono || '—'}</span>
                          </td>
                          <td>
                            <span
                              className={`badge text-uppercase ${
                                u.rol === 'admin'
                                  ? 'bg-danger'
                                  : u.rol === 'soporte'
                                  ? 'bg-warning text-dark'
                                  : 'bg-primary'
                              }`}
                            >
                              {u.rol || 'estudiante'}
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => toggleVehiculos(u)}
                              disabled={cargandoVehiculosUsuario !== null}
                              title="Ver detalles de vehículos activos"
                            >
                              <i className="bi bi-car-front me-1" />
                              <span className="fw-bold">
                                {cargandoVehiculosUsuario === u.id ? 'Cargando...' : totalVehiculos ?? '-'}
                              </span>
                              <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} ms-1`} />
                            </button>

                            {/* Panel desplegable en la fila */}
                            {isExpanded && (
                              <div className="p-2 mt-2 bg-light rounded text-start small border">
                                <strong className="text-primary d-block mb-1">Vehículos activos de {u.first_name || u.email}:</strong>
                                {renderDetalleVehiculos(u)}
                              </div>
                            )}
                          </td>
                          <td className="text-center">
                            <span className={`badge ${u.activo ? 'bg-success' : 'bg-secondary'}`}>
                              {u.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="text-center pe-4">
                            {!esAdmin ? (
                              <span className="text-muted small">Solo lectura</span>
                            ) : u.id === currentUser?.id ? (
                              <span className="text-muted small fst-italic">Su propia cuenta</span>
                            ) : canDeactivateUser(currentUser, u) ? (
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => desactivar(u)}
                                title="Desactivar cuenta del usuario"
                              >
                                <i className="bi bi-person-x me-1" />Desactivar
                              </button>
                            ) : (
                              <span className="badge bg-secondary">Desactivada</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Paginación del backend ── */}
          {totalPages > 1 && (
            <nav className="mt-4 d-flex justify-content-center" aria-label="Navegación de usuarios">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                  >
                    <i className="bi bi-chevron-left me-1" />Anterior
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setPage(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
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
