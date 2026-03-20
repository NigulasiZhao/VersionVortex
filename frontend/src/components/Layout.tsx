import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('vm_token');
    setIsLoggedIn(!!token);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('vm_token');
    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-accent-fg)]">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span className="font-semibold text-base text-[var(--color-fg-default)]">VersionManage</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link to="/" className={`no-underline px-2 py-1 rounded-md transition-colors ${location.pathname === '/' ? 'text-[var(--color-fg-default)] bg-[var(--color-canvas-default)]' : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-canvas-default)]'}`}>
                Releases
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  to="/admin"
                  className="text-xs px-3 py-1.5 rounded-md border border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-all no-underline"
                >
                  管理后台
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs px-3 py-1.5 rounded-md border border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-danger-fg)] hover:text-[var(--color-danger-fg)] transition-all"
                >
                  退出
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-xs px-4 py-1.5 rounded-md text-white transition-all no-underline"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-default)] py-6 text-center text-xs text-[var(--color-fg-muted)]">
        <div className="max-w-5xl mx-auto px-4">
          VersionManage © {new Date().getFullYear()} · 开源版本管理平台
        </div>
      </footer>
    </div>
  );
}
