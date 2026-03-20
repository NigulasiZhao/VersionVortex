import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('vm_username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vm_token');
    localStorage.removeItem('vm_username');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span className="font-semibold text-base text-foreground">VersionManage</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link to="/" className={`no-underline px-2 py-1 rounded-md transition-colors ${location.pathname === '/' ? 'text-foreground bg-secondary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                Releases
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">{username}</span>
            <Link
              to="/admin"
              className="text-xs px-3 py-1.5 rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:border-primary transition-all no-underline"
            >
              管理后台
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-md border border-input bg-background text-muted-foreground hover:text-destructive hover:border-destructive transition-all"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto px-4">
          VersionManage © {new Date().getFullYear()} · 开源版本管理平台
        </div>
      </footer>
    </div>
  );
}
