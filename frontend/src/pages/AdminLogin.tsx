import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminLogin(username, password);
      localStorage.setItem('vm_token', data.token);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas-default)' }}>
      <div className="w-full max-w-sm mx-4 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center mx-auto mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--color-fg-default)]">管理后台</h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-1">VersionManage 版本管理平台</p>
        </div>

        {/* Form */}
        <div className="border border-[var(--color-border-default)] rounded-xl p-6" style={{ background: 'var(--color-canvas-subtle)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-fg-default)] mb-1.5">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] placeholder-[var(--color-fg-subtle)] focus:outline-none focus:border-[var(--color-accent-fg)] transition-colors"
                style={{ background: 'var(--color-canvas-default)' }}
                placeholder="输入用户名"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-fg-default)] mb-1.5">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] placeholder-[var(--color-fg-subtle)] focus:outline-none focus:border-[var(--color-accent-fg)] transition-colors"
                style={{ background: 'var(--color-canvas-default)' }}
                placeholder="输入密码"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-[var(--color-danger-fg)] bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-[var(--color-fg-muted)]">
              默认账号: <span className="font-mono text-[var(--color-fg-subtle)]">admin</span> / <span className="font-mono text-[var(--color-fg-subtle)]">admin123</span>
            </p>
          </div>
        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] no-underline">
            ← 返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
