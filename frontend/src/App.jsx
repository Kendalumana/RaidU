import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegistroPage from './pages/RegistroPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PerfilPage from './pages/PerfilPage.jsx';
import AjustesPage from './pages/AjustesPage.jsx';
import UsuariosPage from './pages/UsuariosPage.jsx';
import VehiculosPage from './pages/VehiculosPage.jsx';
import ViajesPage from './pages/ViajesPage.jsx';
import ReservasPage from './pages/ReservasPage.jsx';
import CalificacionesPage from './pages/CalificacionesPage.jsx';

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />;
}

function RegistroRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <RegistroPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/registro" element={<RegistroRoute />} />

          {/* Rutas protegidas con layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/ajustes" element={<AjustesPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/vehiculos" element={<VehiculosPage />} />
              <Route path="/viajes" element={<ViajesPage />} />
              <Route path="/reservas" element={<ReservasPage />} />
              <Route path="/calificaciones" element={<CalificacionesPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
