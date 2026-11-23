import axios from 'axios';

const envApi = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : undefined;
const baseURL = (envApi || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

export const api = axios.create({ baseURL, timeout: 12000 });

// Adjunta el token salvo en endpoints públicos o peticiones que ya indican su token.
// Evita sobrescribir el token recién recibido durante el inicio de sesión.
api.interceptors.request.use(config => {
  if (config.url === '/token/' || config.url === '/usuarios/registro/') return config;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('raidu_token') : null;
  const header = config.headers?.get?.('Authorization') ?? config.headers?.Authorization;
  if (token && !header) config.headers.Authorization = `Token ${token}`;
  return config;
});

export function getError(error) {
  if (!error || !error.response)
    return 'No se puede conectar con el servidor. Compruebe que Django esté corriendo.';

  const status = error.response.status;
  const data = error.response.data;

  // Servidor 5xx o respuestas que devuelven HTML
  const isHtml = typeof data === 'string' && (data.includes('<!DOCTYPE') || data.includes('<html') || data.includes('<body'));
  if (status >= 500 || isHtml) {
    return 'Ocurrió un error en el servidor. Por favor, reintente en unos momentos.';
  }

  if (typeof data === 'string' && data.trim()) return data;
  if (data?.detail) return data.detail;
  if (data?.non_field_errors) {
    return Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : String(data.non_field_errors);
  }
  if (typeof data === 'object' && data !== null) {
    const mensajes = Object.entries(data)
      .map(([campo, errores]) => {
        const lista = Array.isArray(errores) ? errores.join(', ') : errores;
        return `${campo}: ${lista}`;
      });
    if (mensajes.length) return mensajes.join(' | ');
  }
  return `Error HTTP ${status}`;
}
