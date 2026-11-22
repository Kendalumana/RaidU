import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, getError } from '../api/client.js';
import { shouldLogoutOnUnauthorized } from './sessionPolicy.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'raidu_token';
const USER_KEY = 'raidu_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  // No se confía en un perfil previamente guardado hasta verificar el token con Django.
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() =>
    localStorage.getItem(TOKEN_KEY) ? 'checking' : 'guest'
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  const guardarSesion = useCallback((nuevoToken, perfil) => {
    if (!nuevoToken || !perfil?.id) {
      throw new Error('El servidor no devolvió una sesión y un perfil válidos.');
    }
    localStorage.setItem(TOKEN_KEY, nuevoToken);
    localStorage.setItem(USER_KEY, JSON.stringify(perfil));
    setToken(nuevoToken);
    setUser(perfil);
    setStatus('authenticated');
    return perfil;
  }, []);

  // Actualizar el perfil desde Django (también permite reintentar tras un fallo de red).
  const fetchProfile = useCallback(async () => {
    const actual = localStorage.getItem(TOKEN_KEY);
    if (!actual) throw new Error('No existe una sesión activa.');
    const { data } = await api.get('/perfil/', {
      headers: { Authorization: `Token ${actual}` },
    });
    if (localStorage.getItem(TOKEN_KEY) !== actual) {
      throw new Error('La sesión cambió durante la consulta.');
    }
    return guardarSesion(actual, data);
  }, [guardarSesion]);

  // La sesión almacenada solo es válida después de consultar el perfil real.
  useEffect(() => {
    const guardado = localStorage.getItem(TOKEN_KEY);
    if (!guardado) return;
    let vigente = true;
    api.get('/perfil/', { headers: { Authorization: `Token ${guardado}` } })
      .then(({ data }) => {
        if (vigente && localStorage.getItem(TOKEN_KEY) === guardado) {
          guardarSesion(guardado, data);
        }
      })
      .catch((error) => {
        if (!vigente || localStorage.getItem(TOKEN_KEY) !== guardado) return;
        if (error?.response?.status === 401) {
          logout();
        } else {
          // Una caída de red no debe revocar un token potencialmente válido.
          setStatus('unavailable');
        }
      });
    return () => { vigente = false; };
  }, [guardarSesion, logout]);

  // En peticiones privadas, un 401 del token actualmente activo cierra la sesión.
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (shouldLogoutOnUnauthorized(error, localStorage.getItem(TOKEN_KEY))) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [logout]);

  // No se persiste el token hasta confirmar que el backend devuelve un perfil válido.
  const login = useCallback(async (username, password) => {
    try {
      const { data } = await api.post('/token/', { username, password });
      if (!data?.token) throw new Error('El servidor no devolvió un token.');
      const { data: perfil } = await api.get('/perfil/', {
        headers: { Authorization: `Token ${data.token}` },
      });
      guardarSesion(data.token, perfil);
    } catch (error) {
      throw new Error(error.isAxiosError ? getError(error) : error.message);
    }
  }, [guardarSesion]);

  return (
    <AuthContext.Provider value={{
      login, logout, fetchProfile, token, user, status,
      isAuthenticated: status === 'authenticated' && Boolean(token && user),
      rol: user?.rol || 'estudiante',
      esAdmin: Boolean(user?.es_admin),
      esSoporte: Boolean(user?.es_soporte),
      esConductor: Boolean(user?.es_conductor),
      cantidadVehiculos: user?.cantidad_vehiculos || 0,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
