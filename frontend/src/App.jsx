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
  const { isAuthenticated, status } = useAuth();
  if (status === 'checking') return <div className="p-5 text-center" role="status">Validando sesión...</div>;
  return isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />;
}

function RegistroRoute() {
  const { isAuthenticated, status } = useAuth();
  if (status === 'checking') return <div className="p-5 text-center" role="status">Validando sesión...</div>;
  return isAuthenticated ? <Navigate to="/" replace /> : <RegistroPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/registro" element={<RegistroRoute />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/ajustes" element={<AjustesPage />} />
              <Route element={<ProtectedRoute allowedRoles={['admin', 'soporte']} />}>
                <Route path="/usuarios" element={<UsuariosPage />} />
              </Route>
              <Route path="/vehiculos" element={<VehiculosPage />} />
              <Route path="/viajes" element={<ViajesPage />} />
              <Route path="/reservas" element={<ReservasPage />} />
              <Route path="/calificaciones" element={<CalificacionesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
