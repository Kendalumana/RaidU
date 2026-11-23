import { api } from '../api/client.js';

/**
 * Consulta paginada y filtrada de los viajes personales del participante
 * (viajes conducidos o con reserva confirmada).
 */
export async function getMisViajes(filtros = {}, page = 1) {
  const params = new URLSearchParams({ page });
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      params.set(k, v);
    }
  });
  const { data } = await api.get(`/viajes/mis-viajes/?${params}`);
  return data;
}

/**
 * Consulta paginada del catálogo general de viajes.
 */
export async function getViajes(filtros = {}, page = 1) {
  const params = new URLSearchParams({ page });
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      params.set(k, v);
    }
  });
  const { data } = await api.get(`/viajes/?${params}`);
  return data;
}

export async function createViaje(payload) {
  const { data } = await api.post('/viajes/', payload);
  return data;
}

export async function updateViaje(id, payload) {
  const { data } = await api.patch(`/viajes/${id}/`, payload);
  return data;
}

export async function deleteViaje(id) {
  await api.delete(`/viajes/${id}/`);
}
