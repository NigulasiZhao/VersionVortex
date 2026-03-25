import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sparkles, Github } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    const storedUsername = localStorage.getItem('vm_username');
    const storedRole = localStorage.getItem('vm_role');
    if (storedUsername) {
      setUsername(storedUsername);
    }
    setIsAdmin(storedRole === 'admin');
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
      <header className="sticky top-0 z-40" style={{ background: 'rgba(250,250,249,0.95)', backdropFilter: 'blur(10px)' }}>
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
            <span className="text-xs text-[var(--color-fg-muted)] hidden sm:inline">{username}</span>
            {isAdmin && (
              <Link
                to={isAdminPage ? "/" : "/admin"}
                className="text-xs text-[var(--color-fg-muted)] hover:text-[#6C3FF5] no-underline px-3 py-1.5 rounded-md border transition-all"
                style={{ borderColor: 'var(--color-border-default)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6C3FF5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-default)'; }}
              >
                {isAdminPage ? "查看前台" : "管理后台"}
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-danger-fg)] px-3 py-1.5 rounded-md border transition-all"
              style={{ borderColor: 'var(--color-border-default)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-danger-fg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-default)'; }}
            >
              退出登录
            </button>
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
