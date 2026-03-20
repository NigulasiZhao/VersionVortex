import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ReleaseDetail from './pages/ReleaseDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import VersionEdit from './pages/VersionEdit';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - require authentication */}
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<Home />} />
          <Route path="releases/:tag" element={<ReleaseDetail />} />
          <Route path="package/:name" element={<Home />} />
        </Route>

        {/* Admin routes - require admin role */}
        <Route element={<RequireAuth><RequireAdmin><Layout /></RequireAdmin></RequireAuth>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/releases/new" element={<VersionEdit />} />
          <Route path="/admin/releases/:id/edit" element={<VersionEdit />} />
        </Route>

        {/* Public login pages */}
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/admin/login" element={<PublicOnly><AdminLogin /></PublicOnly>} />

        {/* Redirect root to home or login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('vm_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const role = localStorage.getItem('vm_role');
  if (role !== 'admin') {
    // Redirect non-admin users to home page
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('vm_token');
  if (token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default App;
