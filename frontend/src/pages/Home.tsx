import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getReleases, getPackages, getStats } from '../services/api';
import type { Release, Package } from '../types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Home() {
  const { name: packageName } = useParams();
  const [releases, setReleases] = useState<Release[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>(packageName || 'all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReleases(), getPackages(), getStats()])
      .then(([r, p, s]) => {
        setReleases(r);
        setPackages(p);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = selectedPackage === 'all'
    ? releases
    : releases.filter((r) => r.package_name === selectedPackage);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent-emphasis)] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-[var(--color-fg-muted)] text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-8 py-8 px-4 rounded-2xl border border-[var(--color-border-default)]" style={{ background: 'linear-gradient(135deg, var(--color-canvas-subtle) 0%, var(--color-canvas-inset) 100%)' }}>
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-fg-default)] mb-2">
          {packageName ? packages.find(p => p.name === packageName)?.description || packageName : '版本发布'}
        </h1>
        <p className="text-[var(--color-fg-muted)] text-sm max-w-md mx-auto mb-5">
          快速获取最新版本的应用程序、安装包和开发资源
        </p>
        {stats && (
          <div className="flex justify-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--color-fg-default)]">{stats.totalReleases}</div>
              <div className="text-[var(--color-fg-muted)]">版本</div>
            </div>
            <div className="w-px bg-[var(--color-border-default)]" />
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--color-fg-default)]">{stats.totalPackages}</div>
              <div className="text-[var(--color-fg-muted)]">软件包</div>
            </div>
            <div className="w-px bg-[var(--color-border-default)]" />
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--color-fg-default)]">{Number(stats.totalDownloads).toLocaleString()}</div>
              <div className="text-[var(--color-fg-muted)]">下载</div>
            </div>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-sm text-[var(--color-fg-muted)]">筛选:</span>
        <button
          onClick={() => setSelectedPackage('all')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            selectedPackage === 'all'
              ? 'bg-[var(--color-accent-emphasis)] border-[var(--color-accent-emphasis)] text-white'
              : 'border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
          }`}
        >
          全部
        </button>
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => setSelectedPackage(pkg.name)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              selectedPackage === pkg.name
                ? 'bg-[var(--color-accent-emphasis)] border-[var(--color-accent-emphasis)] text-white'
                : 'border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
            }`}
          >
            {pkg.name}
          </button>
        ))}
      </div>

      {/* Releases List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-fg-muted)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-40">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <p>暂无版本</p>
          </div>
        ) : (
          filtered.map((release, index) => (
            <div
              key={release.id}
              className="border border-[var(--color-border-default)] rounded-xl overflow-hidden hover:border-[var(--color-fg-muted)] transition-all"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link to={`/releases/${release.tag_name}`} className="font-mono font-semibold text-base text-[var(--color-accent-fg)] hover:underline">
                      {release.tag_name}
                    </Link>
                    {release.is_prerelease === 1 && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-attention-fg)] text-[var(--color-attention-fg)]">
                        Pre-release
                      </span>
                    )}
                    {release.is_draft === 1 && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-fg-muted)] text-[var(--color-fg-muted)]">
                        Draft
                      </span>
                    )}
                  </div>
                  {release.title && (
                    <h2 className="text-base font-medium text-[var(--color-fg-default)] mb-1">{release.title}</h2>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[var(--color-fg-muted)] mb-3">
                    <span>{release.package_name}</span>
                    <span>·</span>
                    <span>{formatDate(release.created_at)}</span>
                    {release.total_downloads !== undefined && release.total_downloads > 0 && (
                      <>
                        <span>·</span>
                        <span>{Number(release.total_downloads).toLocaleString()} 次下载</span>
                      </>
                    )}
                  </div>
                  {release.body && (
                    <p className="text-sm text-[var(--color-fg-muted)] line-clamp-2 leading-relaxed">
                      {release.body.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 3).join(' · ')}
                    </p>
                  )}
                </div>
                <Link
                  to={`/releases/${release.tag_name}`}
                  className="ml-4 shrink-0 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-all no-underline"
                >
                  查看详情
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
