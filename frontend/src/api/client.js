import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

export const api = axios.create({ baseURL, timeout: 12000 });

// Adjunta el token salvo en endpoints públicos o peticiones que ya indican su token.
// Evita sobrescribir el token recién recibido durante el inicio de sesión.
api.interceptors.request.use(config => {
  if (config.url === '/token/' || config.url === '/usuarios/registro/') return config;
  const token = localStorage.getItem('raidu_token');
  const header = config.headers?.get?.('Authorization') ?? config.headers?.Authorization;
  if (token && !header) config.headers.Authorization = `Token ${token}`;
  return config;
});

export function getError(error) {
  if (!error.response)
    return 'No se puede conectar con el servidor. Compruebe que Django esté corriendo.';

  const data = error.response.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data?.non_field_errors) return data.non_field_errors.join(' ');
  if (typeof data === 'object' && data !== null) {
    const mensajes = Object.entries(data)
      .map(([campo, errores]) => {
        const lista = Array.isArray(errores) ? errores.join(', ') : errores;
        return `${campo}: ${lista}`;
      });
    if (mensajes.length) return mensajes.join(' | ');
  }
  return `Error HTTP ${error.response.status}`;
}
