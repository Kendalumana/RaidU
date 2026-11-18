import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';

export default function UsuariosPage() {
  const { rol, esAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const cargar = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/usuarios/?page=${p}`);
      setUsuarios(data.results || []);
      setPage(data.page || p);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const desactivar = async (id, nombre) => {
    if (!window.confirm(`¿Desactivar la cuenta de "${nombre}"? Esta acción es reversible solo desde el admin.`))
      return;
    setMsg('');
    try {
      await api.delete(`/usuarios/${id}/`);
      setMsg(`Cuenta de "${nombre}" desactivada.`);
      cargar(page);
    } catch (err) {
      setError(getError(err));
    }
  };

  if (rol !== 'admin' && rol !== 'soporte') {
    return (
      <div className="alert alert-warning">
        <i className="bi bi-shield-exclamation me-2" />No tenés permisos para ver esta sección.
      </div>
    );
  }

  return (
    <>
      <h1 className="h3 fw-bold mb-4"><i className="bi bi-people me-2" />Gestión de Usuarios</h1>

      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <>
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Correo</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    {esAdmin && <th className="text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr><td colSpan={esAdmin ? 6 : 5} className="text-center text-secondary py-4">
                      No hay usuarios registrados.
                    </td></tr>
                  ) : (
                    usuarios.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.email}</td>
                        <td>{u.first_name} {u.last_name}</td>
                        <td>{u.telefono || '—'}</td>
                        <td>
                          <span className={`badge ${u.activo ? 'bg-success' : 'bg-secondary'}`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        {esAdmin && (
                          <td className="text-center">
                            {u.activo && (
                              <button className="btn btn-outline-danger btn-sm"
                                onClick={() => desactivar(u.id, u.email)}>
                                <i className="bi bi-person-x me-1" />Desactivar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <nav className="mt-3 d-flex justify-content-center">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => cargar(page - 1)}>Anterior</button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => cargar(i + 1)}>{i + 1}</button>
                  </li>
                ))}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => cargar(page + 1)}>Siguiente</button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </>
  );
}
