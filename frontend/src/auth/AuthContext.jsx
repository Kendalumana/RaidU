import { createContext, useContext, useState, useCallback } from 'react';
import { api, getError } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('raidu_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('raidu_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Obtener perfil completo del usuario (incluye rol).
  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/perfil/');
      localStorage.setItem('raidu_user', JSON.stringify(data));
      setUser(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  // Iniciar sesión: obtiene token y luego carga el perfil.
  const login = useCallback(async (username, password) => {
    try {
      const { data } = await api.post('/token/', { username, password });
      if (!data?.token) throw new Error('El servidor no devolvió el token.');
      localStorage.setItem('raidu_token', data.token);
      setToken(data.token);
      // Cargar perfil con roles.
      const { data: perfil } = await api.get('/perfil/', {
        headers: { Authorization: `Token ${data.token}` },
      });
      localStorage.setItem('raidu_user', JSON.stringify(perfil));
      setUser(perfil);
    } catch (error) {
      throw new Error(error.isAxiosError ? getError(error) : error.message);
    }
  }, []);

  // Cerrar sesión.
  const logout = useCallback(() => {
    localStorage.removeItem('raidu_token');
    localStorage.removeItem('raidu_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    login,
    logout,
    fetchProfile,
    token,
    user,
    isAuthenticated: Boolean(token),
    rol: user?.rol || 'estudiante',
    esAdmin: user?.es_admin || false,
    esSoporte: user?.es_soporte || false,
    esConductor: Boolean(user?.es_conductor),
    cantidadVehiculos: user?.cantidad_vehiculos || 0,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
