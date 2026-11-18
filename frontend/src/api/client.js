import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

export const api = axios.create({ baseURL, timeout: 12000 });

// Interceptor: adjunta el token de autenticación a cada petición.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('raidu_token');
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

/**
 * Extrae un mensaje de error legible desde la respuesta de Django REST Framework.
 * Soporta: string, { detail }, { non_field_errors }, y diccionarios de campo.
 */
export function getError(error) {
  if (!error.response)
    return 'No se puede conectar con el servidor. Compruebe que Django esté corriendo.';

  const data = error.response.data;

  if (typeof data === 'string') return data;

  if (data?.detail) return data.detail;

  if (data?.non_field_errors) return data.non_field_errors.join(' ');

  // Errores de validación por campo: { "placa": ["Ya existe"], "capacidad": ["Mínimo 1"] }
  if (typeof data === 'object') {
    const mensajes = Object.entries(data)
      .map(([campo, errores]) => {
        const lista = Array.isArray(errores) ? errores.join(', ') : errores;
        return `${campo}: ${lista}`;
      });
    if (mensajes.length) return mensajes.join(' | ');
  }

  return `Error HTTP ${error.response.status}`;
}
