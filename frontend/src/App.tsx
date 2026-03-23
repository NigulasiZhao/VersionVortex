import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import Layout from './components/Layout';
import Home from './pages/Home';
import ReleaseDetail from './pages/ReleaseDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import VersionEdit from './pages/VersionEdit';
import Login from './pages/Login';

// Animation variants for page transitions
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// Reverse animation for back navigation
const pageVariantsReverse: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

function AnimatedRoutes() {
  const location = useLocation();

  // Determine if we're going back (leaving detail page)
  const isReturningFromDetail = location.pathname === '/' &&
    sessionStorage.getItem('home-scroll-position');

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes - require authentication */}
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={
            <motion.div
              variants={isReturningFromDetail ? pageVariantsReverse : pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Home />
            </motion.div>
          } />
          <Route path="releases/:tag" element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <ReleaseDetail />
            </motion.div>
          } />
          <Route path="package/:name" element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Home />
            </motion.div>
          } />
        </Route>

        {/* Admin routes - require admin role */}
        <Route element={<RequireAuth><RequireAdmin><Layout /></RequireAdmin></RequireAuth>}>
          <Route path="/admin" element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <AdminDashboard />
            </motion.div>
          } />
          <Route path="/admin/releases/new" element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <VersionEdit />
            </motion.div>
          } />
          <Route path="/admin/releases/:id/edit" element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <VersionEdit />
            </motion.div>
          } />
        </Route>

        {/* Public login pages */}
        <Route path="/login" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <PublicOnly><Login /></PublicOnly>
          </motion.div>
        } />
        <Route path="/admin/login" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <PublicOnly><AdminLogin /></PublicOnly>
          </motion.div>
        } />

        {/* Redirect root to home or login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
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
