import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api, getError } from '../api/client.js';

// ── Validación de placa costarricense ──────────────────────────────────
// Vehículos particulares en Costa Rica:
// • 1 a 6 caracteres alfanuméricos (letras y números, ej: ABC123, 12ABC1, 542189, etc.)
// • Guion opcional (ej: ABC-123)
// • Placas de 7 o más caracteres: taxis, autobuses, equipo especial o carga (NO permitidas en RaidU)
function validarPlacaCR(placa) {
  const limpia = placa.replace(/[\s-]/g, '').trim().toUpperCase();

  if (limpia.length === 0) {
    return { valida: false, esTransportePublico: false, mensaje: '' };
  }

  // Si tiene 7 o más caracteres: alerta de transporte público / taxis
  if (limpia.length > 6) {
    return {
      valida: false,
      esTransportePublico: true,
      mensaje:
        'Las placas de más de 6 caracteres corresponden a vehículos de transporte público (taxis, buses, carga). ' +
        'RaidU es exclusivo para vehículos particulares de estudiantes UCR.',
    };
  }

  // Caracteres permitidos: letras y números
  const soloAlfanumerico = /^[A-Z0-9]+$/;
  if (!soloAlfanumerico.test(limpia)) {
    return {
      valida: false,
      esTransportePublico: false,
      mensaje: 'La placa solo debe contener letras y números (sin símbolos ni caracteres especiales).',
    };
  }

  if (limpia.length < 3) {
    return {
      valida: false,
      esTransportePublico: false,
      mensaje: 'La placa debe tener al menos 3 caracteres.',
    };
  }

  // Válida: entre 3 y 6 caracteres alfanuméricos
  return { valida: true, esTransportePublico: false, mensaje: '' };
}

export default function VehiculosPage() {
  const { rol, esSoporte, fetchProfile } = useAuth();

  // ¿Tiene al menos un vehículo activo para poder publicar viajes?
  const [tieneVehiculoActivo, setTieneVehiculoActivo] = useState(false);
  const navigate = useNavigate();

  // Estados del listado
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Búsqueda y paginación
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Estados del modal de Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState('');
  const [placaError, setPlacaError] = useState(''); // error en tiempo real de la placa
  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    capacidad: 4,
    activo: true,
  });

  // Cargar vehículos desde el backend
  const cargarVehiculos = useCallback(async (p = 1, q = busqueda) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (p > 1) params.append('page', p);
      if (q.trim()) params.append('search', q.trim());

      const url = `/vehiculos/${params.toString() ? `?${params.toString()}` : ''}`;
      const { data } = await api.get(url);

      setVehiculos(data.results || []);
      setPage(data.page || p);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.count || 0);
      // Detectar si hay al menos un vehículo activo para habilitar el FAB
      const activos = (data.results || []).filter((v) => v.activo);
      setTieneVehiculoActivo(activos.length > 0);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [busqueda]);

  useEffect(() => {
    cargarVehiculos(1);
  }, [cargarVehiculos]);

  // Manejar búsqueda en vivo con debounce
  const handleBuscar = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);
    cargarVehiculos(1, valor);
  };

  // Abrir modal para Crear
  const abrirCrear = () => {
    setEditandoId(null);
    setForm({ placa: '', marca: '', modelo: '', capacidad: 4, activo: true });
    setFormError('');
    setPlacaError('');
    setModalAbierto(true);
  };

  // Abrir modal para Editar
  const abrirEditar = (veh) => {
    setEditandoId(veh.id);
    setForm({
      placa: veh.placa,
      marca: veh.marca,
      modelo: veh.modelo,
      capacidad: veh.capacidad,
      activo: veh.activo,
    });
    setFormError('');
    setPlacaError('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditandoId(null);
    setFormError('');
    setPlacaError('');
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.placa.trim() || !form.marca.trim() || !form.modelo.trim()) {
      setFormError('Por favor complete todos los campos obligatorios.');
      return;
    }

    // ── Validación de placa costarricense ──
    const { valida, mensaje } = validarPlacaCR(form.placa);
    if (!valida) {
      setFormError(mensaje);
      return;
    }

    if (form.capacidad < 1 || form.capacidad > 5) {
      setFormError('La capacidad debe ser entre 1 y 5 pasajeros.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        placa: form.placa.trim().toUpperCase(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        capacidad: Number(form.capacidad),
        activo: Boolean(form.activo),
      };

      if (editandoId) {
        await api.patch(`/vehiculos/${editandoId}/`, payload);
        setMsg(`Vehículo ${payload.placa} actualizado con éxito.`);
      } else {
        await api.post('/vehiculos/', payload);
        setMsg(`Vehículo ${payload.placa} registrado con éxito.`);
      }
      if (fetchProfile) await fetchProfile();
      cerrarModal();
      cargarVehiculos(editandoId ? page : 1);
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar vehículo
  const handleEliminar = async (id, placa) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el vehículo placa "${placa}"?`)) {
      return;
    }
    setError('');
    setMsg('');
    try {
      await api.delete(`/vehiculos/${id}/`);
      setMsg(`Vehículo ${placa} eliminado exitosamente.`);
      if (fetchProfile) await fetchProfile();
      cargarVehiculos(page);
    } catch (err) {
      setError(getError(err));
    }
  };

  // Navegar a publicar viaje con este vehículo
  const irAPublicarViaje = (vehiculoId) => {
    navigate(`/viajes?nuevo=true&vehiculo=${vehiculoId}`);
  };

  return (
    <div className="d-flex flex-column gap-4 position-relative pb-5">
      {/* ── Encabezado y Barra de Acciones ── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h1 className="h4 fw-bold text-dark mb-0">Mis Vehículos</h1>
            <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1 fw-semibold small">
              {totalCount} {totalCount === 1 ? 'Vehículo' : 'Vehículos'}
            </span>
          </div>
          <p className="text-secondary small mb-0 mt-1">
            Gestiona los vehículos que utilizas como conductor para compartir viajes en la UCR
          </p>
        </div>

        {/* Botones de acción en escritorio */}
        <div className="d-flex align-items-center gap-2 w-100 w-md-auto">
          {!esSoporte && (
            <>
              <button
                type="button"
                onClick={abrirCrear}
                className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm flex-grow-1 flex-md-grow-0 fw-medium"
              >
                <i className="bi bi-plus-lg" />
                <span>+ Nuevo Vehículo</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/viajes?nuevo=true')}
                className="btn btn-outline-success d-none d-md-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm fw-medium"
                title="Publicar un viaje con tus vehículos"
              >
                <i className="bi bi-compass-fill" />
                <span>Publicar Viaje</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Alertas Globales ── */}
      {msg && (
        <div className="alert alert-success border-0 shadow-sm rounded-4 d-flex align-items-center gap-2 py-3 px-4">
          <i className="bi bi-check-circle-fill text-success fs-5" />
          <span className="small fw-medium">{msg}</span>
          <button type="button" className="btn-close ms-auto" onClick={() => setMsg('')} />
        </div>
      )}

      {error && (
        <div className="alert alert-danger border-0 shadow-sm rounded-4 d-flex align-items-center gap-2 py-3 px-4">
          <i className="bi bi-exclamation-triangle-fill text-danger fs-5" />
          <span className="small fw-medium">{error}</span>
          <button type="button" className="btn-close ms-auto" onClick={() => setError('')} />
        </div>
      )}

      {/* ── Barra de Búsqueda y Filtro ── */}
      <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6 col-lg-5 position-relative">
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary" />
            <input
              type="text"
              className="form-control rounded-pill ps-5 bg-light border-0 py-2 small"
              placeholder="Buscar por placa, marca o modelo..."
              value={busqueda}
              onChange={handleBuscar}
            />
          </div>
          {busqueda && (
            <div className="col-auto">
              <button
                type="button"
                onClick={() => {
                  setBusqueda('');
                  cargarVehiculos(1, '');
                }}
                className="btn btn-sm btn-light rounded-pill px-3 text-secondary"
              >
                Limpiar filtro
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Grid de Cards de Vehículos ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-secondary small">Cargando tus vehículos...</p>
        </div>
      ) : vehiculos.length === 0 ? (
        /* Estado Vacío */
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
          <div
            className="rounded-circle bg-light text-primary d-inline-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: 70, height: 70 }}
          >
            <i className="bi bi-truck-front-fill fs-2" />
          </div>
          <h4 className="fw-bold text-dark">Aún no tienes vehículos registrados</h4>
          <p className="text-secondary small mx-auto" style={{ maxWidth: 420 }}>
            Para poder ofrecer y publicar viajes a otros compañeros de la UCR, debes registrar tu primer auto aquí.
          </p>
          {!esSoporte && (
            <button
              type="button"
              onClick={abrirCrear}
              className="btn btn-primary rounded-pill px-4 py-2 mx-auto mt-2 d-inline-flex align-items-center gap-2"
            >
              <i className="bi bi-plus-lg" />
              <span>Registrar mi primer vehículo</span>
            </button>
          )}
        </div>
      ) : (
        <div className="row g-3 g-xl-4">
          {vehiculos.map((v) => (
            <div className="col-12 col-md-6 col-xl-4" key={v.id}>
              {/* Card de Vehículo Estilo Dribbble */}
              <div
                className="card border-0 rounded-4 shadow-sm h-100 bg-white p-4 d-flex flex-column justify-content-between"
                style={{
                  border: '1px solid #f1f5f9',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Cabecera del Card: Placa y Estado */}
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    {/* Badge estilo placa física de auto */}
                    <div
                      className="px-3 py-1 rounded-3 fw-bold border d-inline-flex align-items-center gap-2 bg-light shadow-2xs"
                      style={{
                        letterSpacing: '0.12em',
                        fontFamily: 'monospace',
                        fontSize: '0.95rem',
                        borderColor: '#cbd5e1',
                      }}
                    >
                      <span className="text-secondary opacity-75" style={{ fontSize: '0.65rem' }}>CR</span>
                      <span className="text-dark">{v.placa}</span>
                    </div>

                    {/* Badge de Activo / Inactivo */}
                    <span
                      className={`badge rounded-pill px-3 py-1 small fw-semibold ${
                        v.activo ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'
                      }`}
                    >
                      {v.activo ? '● Activo' : '● Inactivo'}
                    </span>
                  </div>

                  {/* Marca y Modelo */}
                  <h3 className="h5 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <i className="bi bi-car-front-fill text-primary" />
                    <span>{v.marca} {v.modelo}</span>
                  </h3>
                  <p className="text-secondary small mb-3">
                    Registrado en plataforma RaidU
                  </p>

                  {/* Subdetalles del Vehículo */}
                  <div className="bg-light rounded-3 p-3 mb-3 d-flex flex-column gap-2">
                    {/* Capacidad con iconos de asientos */}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-secondary small fw-medium">Capacidad de Pasajeros:</span>
                      <div className="d-flex align-items-center gap-1">
                        <span className="fw-bold text-dark small me-1">{v.capacidad} cupos</span>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <i
                            key={i}
                            className={`bi bi-person-fill ${i < v.capacidad ? 'text-primary' : 'text-muted opacity-25'}`}
                            style={{ fontSize: '0.85rem' }}
                            title={`Cupo ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Subdetalle: Exclusión del conductor */}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-secondary small">Asiento Conductor:</span>
                      <span className="badge bg-white text-secondary border small">Excluido (Automático)</span>
                    </div>

                    {/* Propietario (si es admin o soporte) */}
                    {(rol === 'admin' || rol === 'soporte') && v.propietario && (
                      <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-1">
                        <span className="text-secondary small">Propietario ID:</span>
                        <span className="badge bg-info-subtle text-info fw-bold small">#{v.propietario}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── BOTONES DE ACCIÓN: Círculos con etiqueta abajo ── */}
                <div className="d-flex gap-3 mt-auto pt-3 border-top justify-content-center">

                  {/* Publicar Viaje con este vehículo */}
                  {!esSoporte && v.activo && (
                    <button
                      type="button"
                      onClick={() => irAPublicarViaje(v.id)}
                      title="Publicar un viaje con este vehículo"
                      className="btn border-0 p-0 d-flex flex-column align-items-center gap-1"
                      style={{ width: 56 }}
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: 48, height: 48,
                          background: '#ecfdf5',
                          boxShadow: '4px 4px 10px rgba(16,185,129,0.15), -3px -3px 8px #fff',
                        }}
                      >
                        <i className="bi bi-send-fill" style={{ color: '#10b981', fontSize: '1.15rem' }} />
                      </div>
                      <span className="text-secondary fw-medium" style={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
                        Ride
                      </span>
                    </button>
                  )}

                  {/* Editar */}
                  {!esSoporte && (
                    <button
                      type="button"
                      onClick={() => abrirEditar(v)}
                      title="Editar este vehículo"
                      className="btn border-0 p-0 d-flex flex-column align-items-center gap-1"
                      style={{ width: 56 }}
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: 48, height: 48,
                          background: '#eff6ff',
                          boxShadow: '4px 4px 10px rgba(59,130,246,0.12), -3px -3px 8px #fff',
                        }}
                      >
                        <i className="bi bi-pencil-fill" style={{ color: '#3b82f6', fontSize: '1.1rem' }} />
                      </div>
                      <span className="text-secondary fw-medium" style={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
                        Editar
                      </span>
                    </button>
                  )}

                  {/* Eliminar */}
                  {!esSoporte && (
                    <button
                      type="button"
                      onClick={() => handleEliminar(v.id, v.placa)}
                      title="Eliminar este vehículo"
                      className="btn border-0 p-0 d-flex flex-column align-items-center gap-1"
                      style={{ width: 56 }}
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: 48, height: 48,
                          background: '#fff1f2',
                          boxShadow: '4px 4px 10px rgba(239,68,68,0.12), -3px -3px 8px #fff',
                        }}
                      >
                        <i className="bi bi-trash3-fill" style={{ color: '#ef4444', fontSize: '1.1rem' }} />
                      </div>
                      <span className="text-secondary fw-medium" style={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
                        Eliminar
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Paginador Responsivo ── */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
          <button
            type="button"
            className="btn btn-light rounded-pill px-3 btn-sm border"
            disabled={page <= 1}
            onClick={() => cargarVehiculos(page - 1)}
          >
            ← Anterior
          </button>
          <span className="small text-secondary fw-medium px-2">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-light rounded-pill px-3 btn-sm border"
            disabled={page >= totalPages}
            onClick={() => cargarVehiculos(page + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BOTÓN FLOTANTE MÓVIL: "Publicar Viaje" (FAB)
          REGLA DE NEGOCIO: Solo visible si el usuario tiene
          al menos un vehículo activo registrado a su nombre.
          - Solo en móvil (d-md-none)
          - Abajo a la derecha
          - Verde esmeralda llamativo, diferente al resto
          ══════════════════════════════════════════════════════════════ */}
      {!esSoporte && tieneVehiculoActivo && (
        <div
          className="d-md-none position-fixed"
          style={{ bottom: '24px', right: '24px', zIndex: 1045 }}
        >
          <button
            type="button"
            onClick={() => navigate('/viajes?nuevo=true')}
            className="btn text-white rounded-pill px-4 py-3 d-flex align-items-center gap-2 fw-bold"
            style={{
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              boxShadow: '0 10px 25px rgba(16,185,129,0.45)',
              fontSize: '0.95rem',
            }}
          >
            <i className="bi bi-plus-circle-fill fs-5" />
            <span>+ Publicar Viaje</span>
          </button>
        </div>
      )}

      {/* ── Modal Controlado para Crear / Editar Vehículo ── */}
      {modalAbierto && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-0 pb-0 px-4 pt-4">
                <div>
                  <h5 className="modal-title fw-bold text-dark mb-0">
                    {editandoId ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
                  </h5>
                  <p className="text-secondary small mb-0">
                    Ingresa los datos para registrarte como conductor en RaidU
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModal}
                  aria-label="Cerrar"
                />
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body px-4 py-3">
                  {formError && (
                    <div className="alert alert-danger py-2 small rounded-3 mb-3">
                      {formError}
                    </div>
                  )}

                  <div className="row g-3">
                    {/* Placa con validación en tiempo real */}
                    <div className="col-12 col-sm-6">
                      <label htmlFor="placa" className="form-label small fw-semibold">
                        Número de Placa *
                      </label>
                      <input
                        id="placa"
                        type="text"
                        className={`form-control rounded-3 text-uppercase fw-bold ${
                          placaError ? 'is-invalid' : form.placa && !placaError ? 'is-valid' : ''
                        }`}
                        placeholder="Ej: ABC-123 o 123456"
                        maxLength={8}
                        value={form.placa}
                        disabled={editandoId !== null}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setForm({ ...form, placa: val });
                          const limpia = val.replace(/[\s-]/g, '');
                          if (limpia.length > 6) {
                            setPlacaError(
                              'Las placas de más de 6 caracteres corresponden a vehículos de transporte público (taxis, buses, carga). RaidU es exclusivo para vehículos particulares de estudiantes UCR.'
                            );
                          } else if (/[^A-Z0-9-]/.test(val)) {
                            setPlacaError('La placa solo debe contener letras, números y guión.');
                          } else {
                            setPlacaError('');
                          }
                        }}
                        onBlur={() => {
                          if (form.placa.trim()) {
                            const { valida, mensaje } = validarPlacaCR(form.placa);
                            setPlacaError(valida ? '' : mensaje);
                          }
                        }}
                        required
                        autoFocus
                        style={{ letterSpacing: '0.08em', fontFamily: 'monospace' }}
                      />
                      {/* Error de placa como alerta visible */}
                      {placaError && (
                        <div
                          className="mt-2 p-2 rounded-3 d-flex gap-2 align-items-start"
                          style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}
                        >
                          <i className="bi bi-exclamation-triangle-fill text-danger mt-1 flex-shrink-0" />
                          <span className="text-danger small">{placaError}</span>
                        </div>
                      )}
                      {!placaError && form.placa && form.placa.replace(/[\s-]/g, '').length >= 3 && (
                        <div className="text-success small mt-1 d-flex align-items-center gap-1">
                          <i className="bi bi-check-circle-fill" />
                          <span>Formato de placa costarricense válido</span>
                        </div>
                      )}
                      <span className="text-secondary small d-block mt-1" style={{ fontSize: '0.68rem' }}>
                        {editandoId !== null
                          ? 'La placa no se puede cambiar después de registrar el vehículo.'
                          : 'Hasta 6 caracteres (ej: ABC-123, 12ABC1 o 123456). Vehículos particulares UCR.'}
                      </span>
                    </div>

                    {/* Capacidad (1 a 5) */}
                    <div className="col-12 col-sm-6">
                      <label htmlFor="capacidad" className="form-label small fw-semibold">
                        Capacidad Pasajeros *
                      </label>
                      <select
                        id="capacidad"
                        className="form-select rounded-3"
                        value={form.capacidad}
                        onChange={(e) => setForm({ ...form, capacidad: Number(e.target.value) })}
                        required
                      >
                        <option value={1}>1 pasajero</option>
                        <option value={2}>2 pasajeros</option>
                        <option value={3}>3 pasajeros</option>
                        <option value={4}>4 pasajeros (Estándar)</option>
                        <option value={5}>5 pasajeros (Máximo)</option>
                      </select>
                      <span className="text-secondary small" style={{ fontSize: '0.7rem' }}>
                        Sin incluir al conductor
                      </span>
                    </div>

                    {/* Marca */}
                    <div className="col-12 col-sm-6">
                      <label htmlFor="marca" className="form-label small fw-semibold">
                        Marca *
                      </label>
                      <input
                        id="marca"
                        type="text"
                        className="form-control rounded-3"
                        placeholder="Ej: Toyota, Hyundai..."
                        value={form.marca}
                        onChange={(e) => setForm({ ...form, marca: e.target.value })}
                        required
                      />
                    </div>

                    {/* Modelo */}
                    <div className="col-12 col-sm-6">
                      <label htmlFor="modelo" className="form-label small fw-semibold">
                        Modelo *
                      </label>
                      <input
                        id="modelo"
                        type="text"
                        className="form-control rounded-3"
                        placeholder="Ej: Corolla, Accent..."
                        value={form.modelo}
                        onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                        required
                      />
                    </div>

                    {/* Estado Activo */}
                    <div className="col-12 mt-3">
                      <div className="form-check form-switch">
                        <input
                          id="activo"
                          className="form-check-input"
                          type="checkbox"
                          checked={form.activo}
                          onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                        />
                        <label htmlFor="activo" className="form-check-label small fw-medium">
                          Vehículo activo y disponible para ofrecer viajes
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 px-4 pb-4 pt-2">
                  <button
                    type="button"
                    className="btn btn-light rounded-pill px-4"
                    onClick={cerrarModal}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-pill px-4 shadow-sm"
                    disabled={guardando}
                  >
                    {guardando ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Guardando...
                      </>
                    ) : (
                      editandoId ? 'Guardar Cambios' : 'Registrar Vehículo'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
