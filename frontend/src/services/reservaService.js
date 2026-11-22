import { api } from '../api/client.js';

// ─────────────────────────────────────────────
// LISTAR RESERVAS
// ─────────────────────────────────────────────
export async function listReservas({
  page = 1,
  estado = '',
  viaje = '',
} = {}) {
  const params = { page };

  if (estado) params.estado = estado;
  if (viaje) params.viaje = viaje;

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
// ─────────────────────────────────────────────
async function getViajesPage(page = 1) {
  const { data } = await api.get('/viajes/', {
    params: { page },
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