import { api } from '../api/client.js';

// ─────────────────────────────────────────────
// LISTAR TODAS LAS RESERVAS DEL USUARIO
// Usado para saber qué viajes ya tienen una reserva
// y no ofrecerlos de nuevo en "Nueva reserva".
// ─────────────────────────────────────────────
export async function listAllMisReservas(pasajeroId = '') {
  const filtroPasajero = pasajeroId ? { pasajero: pasajeroId } : {};
  const first = await listReservas({ page: 1, ...filtroPasajero });

  if (first.totalPages <= 1) {
    return first.items;
  }

  const pages = await Promise.all(
    Array.from(
      { length: first.totalPages - 1 },
      (_, index) => listReservas({ page: index + 2, ...filtroPasajero })
    )
  );

  return [
    ...first.items,
    ...pages.flatMap((page) => page.items),
  ];
}
export async function listReservas({
  page = 1,
  estado = '',
  viaje = '',
  pasajero = '',
} = {}) {
  const params = { page };

  if (estado) params.estado = estado;
  if (viaje) params.viaje = viaje;
  if (pasajero) params.pasajero = pasajero;

  const { data } = await api.get('/reservas/', { params });

  return {
    items: data.resultados ?? [],
    page: data.pagina_actual ?? page,
    totalPages: data.total_paginas ?? 1,
    total: data.total_registros ?? 0,
  };
}

// ─────────────────────────────────────────────
// CREAR RESERVA
// ─────────────────────────────────────────────
export async function addReserva(reserva) {
  const { data } = await api.post('/reservas/', reserva);
  return data;
}

// ─────────────────────────────────────────────
// ACTUALIZAR RESERVA
// ─────────────────────────────────────────────
export async function updateReserva(id, datos) {
  const { data } = await api.patch(`/reservas/${id}/`, datos);
  return data;
}

// ─────────────────────────────────────────────
// CANCELAR RESERVA
// ─────────────────────────────────────────────
export async function cancelReserva(id) {
  const { data } = await api.patch(`/reservas/${id}/`, {
    estado: 'cancelada',
  });

  return data;
}

// ─────────────────────────────────────────────
// DELETE
// El backend no la borra físicamente:
// la deja como cancelada para conservar historial.
// ─────────────────────────────────────────────
export async function deleteReserva(id) {
  await api.delete(`/reservas/${id}/`);
}

// ─────────────────────────────────────────────
// OBTENER TODOS LOS VIAJES
// Se usan para mostrar información del viaje
// y llenar el select del formulario.
// Se ordenan por fecha_hora ascendente.
// ─────────────────────────────────────────────
async function getViajesPage(page = 1) {
  const { data } = await api.get('/viajes/', {
    params: { page, ordering: 'fecha_hora' },
  });

  return {
    items: data.resultados ?? [],
    totalPages: data.total_paginas ?? 1,
  };
}

export async function listAllViajes() {
  const first = await getViajesPage(1);

  if (first.totalPages <= 1) {
    return first.items;
  }

  const pages = await Promise.all(
    Array.from(
      { length: first.totalPages - 1 },
      (_, index) => getViajesPage(index + 2)
    )
  );

  return [
    ...first.items,
    ...pages.flatMap((page) => page.items),
  ];
}