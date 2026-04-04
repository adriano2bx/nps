import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Surveys from './pages/Surveys';
import Users from './pages/Users';
import Settings from './pages/Settings';
import SurveyBuilder from './pages/SurveyBuilder';
import Reports from './pages/Reports';
import Companies from './pages/Companies';
import MasterDashboard from './pages/MasterDashboard';
import TVDashboard from './pages/TVDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Integrations from './pages/Integrations';

function ProtectedRoute() {
  const { token, loading } = useAuth();
  if (loading) return null; // Or a loading spinner
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function AppContent() {
  const { user, token, loading } = useAuth();

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={
              user?.role === 'MASTER_ADMIN' ? <Navigate to="/master-dashboard" replace /> : <Navigate to="/dashboard" replace />
            } />
            <Route path="master-dashboard" element={<MasterDashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="surveys" element={<Surveys />} />
            <Route path="surveys/new" element={<SurveyBuilder />} />
            <Route path="surveys/edit/:id" element={<SurveyBuilder />} />
            <Route path="reports" element={<Reports />} />
            <Route path="patients" element={<Users />} />
            <Route path="settings" element={<Settings />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="companies" element={<Companies />} />
            <Route path="*" element={
              user?.role === 'MASTER_ADMIN' ? <Navigate to="/master-dashboard" replace /> : <Navigate to="/dashboard" replace />
            } />
          </Route>

          {/* Standalone TV Dashboard (No Layout) */}
          <Route path="tv-dashboard" element={<TVDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
