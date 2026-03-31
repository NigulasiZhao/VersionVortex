import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sparkles, Github } from 'lucide-react';
import { UserDropdown } from "@/components/ui/user-dropdown";
import MotionButton from "@/components/ui/motion-button";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');

  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    const storedUsername = localStorage.getItem('vm_username');
    const storedRole = localStorage.getItem('vm_role');
    if (storedUsername) {
      setUsername(storedUsername);
    }
    setRole(storedRole || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vm_token');
    localStorage.removeItem('vm_username');
    localStorage.removeItem('vm_role');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: 'rgba(250,250,249,0.8)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 no-underline group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: 'linear-gradient(135deg, #6C3FF5 0%, #8B5CF6 100%)' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm text-[var(--color-fg-default)] group-hover:text-[#6C3FF5] transition-colors">VersionVortex</span>
            </Link>
            {isAdminPage && (
              <>
                <span className="text-[var(--color-fg-muted)]">/</span>
                <span className="text-sm text-[var(--color-fg-default)] font-medium">管理后台</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {role === 'admin' && (
              <MotionButton
                label={isAdminPage ? "查看前台" : "管理后台"}
                to={isAdminPage ? "/" : "/admin"}
                variant="secondary"
              />
            )}
            <UserDropdown
              username={username}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-[var(--color-fg-muted)]">
        <div className="max-w-6xl mx-auto px-4">
          <a href="https://github.com/NigulasiZhao/VersionVortex" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity">
            VersionVortex © {new Date().getFullYear()} · 开源版本管理平台
            <Github className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
