import { api } from '../api/client.js';

// ─────────────────────────────────────────────
// LISTAR CALIFICACIONES (con paginación y filtros)
// ─────────────────────────────────────────────
export async function listCalificaciones({
  page = 1,
  viaje = '',
  calificado = '',
  calificador = '',
  puntaje = '',
  ordering = '-fecha',
} = {}) {
  const params = { page, ordering };

  if (viaje) params.viaje = viaje;
  if (calificado) params.calificado = calificado;
  if (calificador) params.calificador = calificador;
  if (puntaje) params.puntaje = puntaje;

  const { data } = await api.get('/calificaciones/', { params });

  return {
    items: data.resultados ?? [],
    page: data.pagina_actual ?? page,
    totalPages: data.total_paginas ?? 1,
    total: data.total_registros ?? 0,
  };
}

// ─────────────────────────────────────────────
// CREAR CALIFICACIÓN
// ─────────────────────────────────────────────
export async function addCalificacion({ viaje, calificado, puntaje, comentario = '' }) {
  const { data } = await api.post('/calificaciones/', {
    viaje: Number(viaje),
    calificado: Number(calificado),
    puntaje: Number(puntaje),
    comentario: comentario.trim(),
  });
  return data;
}

// ─────────────────────────────────────────────
// ACTUALIZAR CALIFICACIÓN (PUT / PATCH)
// ─────────────────────────────────────────────
export async function updateCalificacion(id, { puntaje, comentario }) {
  const { data } = await api.patch(`/calificaciones/${id}/`, {
    ...(puntaje !== undefined ? { puntaje: Number(puntaje) } : {}),
    ...(comentario !== undefined ? { comentario: comentario.trim() } : {}),
  });
  return data;
}

// ─────────────────────────────────────────────
// ELIMINAR CALIFICACIÓN
// ─────────────────────────────────────────────
export async function deleteCalificacion(id) {
  await api.delete(`/calificaciones/${id}/`);
}

// ─────────────────────────────────────────────
// PROMEDIO Y ESTADÍSTICAS DEL USUARIO
// ─────────────────────────────────────────────
export async function getPromedioUsuario(usuarioId) {
  const { data } = await api.get(`/calificaciones/promedio/${usuarioId}/`);
  return {
    promedio: data.promedio,
    total: data.total_calificaciones ?? 0,
  };
}

// ─────────────────────────────────────────────
// LISTAR VIAJES FINALIZADOS EVALUABLES
// ─────────────────────────────────────────────
export async function listViajesFinalizados() {
  const { data } = await api.get('/viajes/', {
    params: { estado: 'finalizado', ordering: '-fecha_hora' },
  });
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, (data.total_paginas ?? 1) - 1) }, (_, i) =>
      api.get('/viajes/', { params: { estado: 'finalizado', ordering: '-fecha_hora', page: i + 2 } })
    )
  );
  return [...(data.resultados ?? []), ...pages.flatMap(({ data: page }) => page.resultados ?? [])];
}
