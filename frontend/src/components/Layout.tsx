import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <span className="font-semibold text-sm text-[var(--color-fg-default)]">VersionManage</span>
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
                className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] no-underline px-3 py-1.5 rounded-md border border-[var(--color-border-default)] hover:border-[var(--color-fg-muted)] transition-all"
              >
                {isAdminPage ? "查看前台" : "管理后台"}
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-danger-fg)] px-3 py-1.5 rounded-md border border-[var(--color-border-default)] hover:border-[var(--color-danger-fg)] transition-all"
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
          VersionManage © {new Date().getFullYear()} · 开源版本管理平台
        </div>
      </footer>
    </div>
  );
}
