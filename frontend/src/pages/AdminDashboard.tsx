import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminReleases,
  getAdminPackages,
  getAdminStats,
  deleteRelease,
  deletePackage,
  createPackage,
  getAdminUsers,
  createUser,
  deleteUser,
  getJenkinsConfigs,
  saveJenkinsConfig,
  deleteJenkinsConfig,
  triggerAllJenkinsBuilds,
  getJenkinsBuildSession,
  getAdminReleases as reloadReleases,
  getAdminStats as reloadStats,
} from '../services/api';
import type { Release, Package, AdminStats, User, JenkinsConfig, BuildSession } from '../types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminDashboard() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [jenkinsConfigs, setJenkinsConfigs] = useState<Record<number, JenkinsConfig>>({});
  const [tab, setTab] = useState<'releases' | 'packages' | 'users'>('releases');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  // 一键发版状态
  const [buildSession, setBuildSession] = useState<BuildSession | null>(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [jenkinsConfigModal, setJenkinsConfigModal] = useState<{ open: boolean; pkg: Package | null }>({ open: false, pkg: null });

  const load = () => {
    Promise.all([getAdminReleases(), getAdminPackages(), getAdminStats(), getAdminUsers(), getJenkinsConfigs()])
      .then(([r, p, s, u, jc]) => {
        setReleases(r);
        setPackages(p);
        setStats(s);
        setUsers(u);
        const configMap: Record<number, JenkinsConfig> = {};
        (jc as JenkinsConfig[]).forEach((c) => { configMap[c.package_id] = c; });
        setJenkinsConfigs(configMap);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const refreshData = () => {
    Promise.all([reloadReleases(), reloadStats()]).then(([r, s]) => {
      setReleases(r);
      setStats(s);
    });
  };

  const handleDeleteRelease = async (id: number) => {
    if (!confirm('确定要删除此版本吗？此操作不可撤销。')) return;
    setDeleting(id);
    try {
      await deleteRelease(id);
      setReleases((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('删除失败');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm('确定要删除此包吗？这将同时删除所有关联版本。')) return;
    setDeleting(id);
    try {
      await deletePackage(id);
      setPackages((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('删除失败');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('确定要删除此用户吗？')) return;
    setDeleting(id);
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    } finally {
      setDeleting(null);
    }
  };

  // 一键发版
  const handleOneClickRelease = async () => {
    setBuildError('');
    setBuildLoading(true);
    try {
      const result = await triggerAllJenkinsBuilds();
      setBuildSession({
        id: result.session_id,
        tag_name: result.tag_name,
        created_at: new Date().toISOString(),
        packages: [], // Will be populated by polling
        overall_status: 'running',
        release_id: null,
      });
      // Start polling
      pollBuildSession(result.session_id);
    } catch (err: any) {
      setBuildError(err.response?.data?.error || err.message);
      setBuildLoading(false);
    }
  };

  const pollBuildSession = (sessionId: string) => {
    const interval = setInterval(async () => {
      try {
        const session = await getJenkinsBuildSession(sessionId);
        setBuildSession(session);
        if (session.overall_status !== 'running') {
          clearInterval(interval);
          setBuildLoading(false);
          // Refresh data when done
          if (session.overall_status === 'completed') {
            load();
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    // Auto-stop after 10 minutes
    setTimeout(() => { clearInterval(interval); setBuildLoading(false); }, 600000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas-default)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent-emphasis)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-canvas-default)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: '版本总数', value: stats.totalReleases, color: 'var(--color-accent-fg)' },
              { label: '软件包', value: stats.totalPackages, color: 'var(--color-success-fg)' },
              { label: '下载次数', value: Number(stats.totalDownloads).toLocaleString(), color: 'var(--color-accent-fg)' },
              { label: '草稿版本', value: stats.draftReleases, color: 'var(--color-fg-muted)' },
            ].map((stat) => (
              <div key={stat.label} className="border border-[var(--color-border-default)] rounded-xl p-4" style={{ background: 'var(--color-canvas-subtle)' }}>
                <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-[var(--color-fg-muted)] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs + New Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {(['releases', 'packages', 'users'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm rounded-lg transition-all ${
                  tab === t
                    ? 'bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)] border border-[var(--color-border-default)]'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
                }`}
              >
                {t === 'releases' ? '版本管理' : t === 'packages' ? '软件包' : '用户管理'}
              </button>
            ))}
          </div>
          {tab === 'releases' && (
            <div className="flex gap-2">
              <button
                onClick={handleOneClickRelease}
                disabled={buildLoading || Object.keys(jenkinsConfigs).length === 0}
                className="text-xs px-4 py-2 rounded-lg bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white transition-colors no-underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {buildLoading ? (
                  <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />构建中...</>
                ) : (
                  <>🚀 一键发版</>
                )}
              </button>
              <Link
                to="/admin/releases/new"
                className="text-xs px-4 py-2 rounded-lg border border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] transition-all no-underline"
              >
                + 新建版本
              </Link>
            </div>
          )}
          {tab === 'packages' && (
            <PackageModal onAdded={(pkg) => setPackages((prev) => [...prev, pkg])} />
          )}
        </div>

        {/* Table */}
        <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden" style={{ background: 'var(--color-canvas-subtle)' }}>
          {tab === 'releases' ? (
            <ReleasesTable
              releases={releases}
              onDelete={handleDeleteRelease}
              deleting={deleting}
            />
          ) : tab === 'packages' ? (
            <PackagesTable
              packages={packages}
              jenkinsConfigs={jenkinsConfigs}
              onDelete={handleDeletePackage}
              deleting={deleting}
              onConfigJenkins={(pkg) => setJenkinsConfigModal({ open: true, pkg })}
            />
          ) : (
            <UsersTable
              users={users}
              onDelete={handleDeleteUser}
              deleting={deleting}
              onAdded={(user) => setUsers((prev) => [...prev, user])}
            />
          )}
        </div>

        {/* 一键发版进度弹窗 */}
        {(buildSession || buildError || buildLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div className="w-full max-w-lg border border-[var(--color-border-default)] rounded-xl" style={{ background: 'var(--color-canvas-subtle)' }}>
              <div className="px-5 py-4 border-b border-[var(--color-border-default)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-fg-default)]">一键发版</h3>
                  {buildSession && (
                    <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                      版本号: <span className="font-mono text-[var(--color-accent-fg)]">{buildSession.tag_name}</span>
                      · {buildSession.packages.length} 个软件包
                    </p>
                  )}
                </div>
                {(!buildLoading || buildSession?.overall_status !== 'running') && (
                  <button onClick={() => { setBuildSession(null); setBuildError(''); }} className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
              <div className="p-5 space-y-3">
                {buildError && (
                  <div className="text-sm text-[var(--color-danger-fg)] bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-lg px-4 py-3">
                    {buildError}
                  </div>
                )}
                {buildLoading && !buildSession && (
                  <div className="flex items-center gap-3 py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-[var(--color-accent-emphasis)] border-t-transparent rounded-full" />
                    <span className="text-sm text-[var(--color-fg-muted)]">正在启动发版任务...</span>
                  </div>
                )}
                {buildSession && (
                  <div className="space-y-2">
                    {buildSession.packages.map((pkg, idx) => (
                      <div key={idx} className="border border-[var(--color-border-default)] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-fg-default)]">{pkg.package_name}</span>
                            {pkg.build_number && (
                              <span className="text-xs text-[var(--color-fg-muted)] font-mono">#${pkg.build_number}</span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            pkg.status === 'completed' ? 'bg-[rgba(63,185,80,0.15)] text-[var(--color-success-fg)]' :
                            pkg.status === 'failed' ? 'bg-[rgba(248,81,73,0.15)] text-[var(--color-danger-fg)]' :
                            pkg.status === 'downloading' ? 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6]' :
                            'bg-[rgba(110,118,129,0.15)] text-[var(--color-fg-muted)]'
                          }`}>
                            {pkg.status === 'pending' && '等待中'}
                            {pkg.status === 'triggering' && '触发中'}
                            {pkg.status === 'building' && '构建中'}
                            {pkg.status === 'downloading' && '下载产物'}
                            {pkg.status === 'completed' && '完成'}
                            {pkg.status === 'failed' && '失败'}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-[var(--color-canvas-default)] mb-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pkg.status === 'failed' ? 'bg-[var(--color-danger-fg)]' :
                              pkg.status === 'completed' ? 'bg-[var(--color-success-fg)]' :
                              'bg-[var(--color-accent-emphasis)]'
                            }`}
                            style={{ width: `${pkg.progress}%` }}
                          />
                        </div>
                        {pkg.error && (
                          <p className="text-xs text-[var(--color-danger-fg)]">{pkg.error}</p>
                        )}
                        {pkg.artifact_name && pkg.status === 'completed' && (
                          <p className="text-xs text-[var(--color-fg-muted)]">
                            📦 {pkg.artifact_name}
                          </p>
                        )}
                      </div>
                    ))}
                    {buildSession.overall_status !== 'running' && (
                      <div className={`text-sm text-center py-2 rounded-lg ${
                        buildSession.overall_status === 'completed'
                          ? 'text-[var(--color-success-fg)]'
                          : 'text-[var(--color-danger-fg)]'
                      }`}>
                        {buildSession.overall_status === 'completed'
                          ? `✅ 全部发版完成，共 ${buildSession.packages.length} 个包`
                          : '⚠️ 发版结束，部分包可能失败'}
                      </div>
                    )}
                  </div>
                )}
                {(!buildLoading || buildSession?.overall_status !== 'running') && (
                  <button
                    onClick={() => { setBuildSession(null); setBuildError(''); }}
                    className="w-full py-2 text-sm border border-[var(--color-border-default)] rounded-lg text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] transition-all"
                  >
                    关闭
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Jenkins 配置弹窗 */}
        {jenkinsConfigModal.open && jenkinsConfigModal.pkg && (
          <JenkinsConfigModal
            pkg={jenkinsConfigModal.pkg}
            existingConfig={jenkinsConfigs[jenkinsConfigModal.pkg.id]}
            onSaved={(config) => {
              setJenkinsConfigs((prev) => ({ ...prev, [config.package_id]: config }));
              setJenkinsConfigModal({ open: false, pkg: null });
            }}
            onDeleted={(pkgId) => {
              setJenkinsConfigs((prev) => { const next = { ...prev }; delete next[pkgId]; return next; });
              setJenkinsConfigModal({ open: false, pkg: null });
            }}
            onClose={() => setJenkinsConfigModal({ open: false, pkg: null })}
          />
        )}
      </div>
    </div>
  );
}

function ReleasesTable({ releases, onDelete, deleting }: {
  releases: Release[];
  onDelete: (id: number) => void;
  deleting: number | null;
}) {
  if (releases.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--color-fg-muted)] text-sm">
        暂无版本，点击右上角「新建版本」创建
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--color-border-default)] text-left">
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">版本</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">软件包</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">状态</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">日期</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider text-right">操作</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-border-muted)]">
        {releases.map((release) => (
          <tr key={release.id} className="hover:bg-[var(--color-canvas-default)] transition-colors">
            <td className="px-4 py-3">
              <div className="font-mono font-medium text-[var(--color-accent-fg)]">{release.tag_name}</div>
              {release.title && <div className="text-xs text-[var(--color-fg-muted)] mt-0.5 truncate max-w-[200px]">{release.title}</div>}
            </td>
            <td className="px-4 py-3 text-[var(--color-fg-muted)]">{release.package_name}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5 flex-wrap">
                {release.is_draft === 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-fg-muted)] text-[var(--color-fg-muted)]">草稿</span>
                )}
                {release.is_prerelease === 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-attention-fg)] text-[var(--color-attention-fg)]">预发布</span>
                )}
                {release.is_draft === 0 && release.is_prerelease === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-success-fg)] text-[var(--color-success-fg)]">正式</span>
                )}
              </div>
            </td>
            <td className="px-4 py-3 text-[var(--color-fg-muted)]">{formatDate(release.created_at)}</td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <Link
                  to={`/admin/releases/${release.id}/edit`}
                  className="text-xs px-3 py-1 rounded-md border border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent-fg)] hover:text-[var(--color-accent-fg)] transition-all no-underline"
                >
                  编辑
                </Link>
                <button
                  onClick={() => onDelete(release.id)}
                  disabled={deleting === release.id}
                  className="text-xs px-3 py-1 rounded-md border border-[var(--color-border-default)] text-[var(--color-danger-fg)] hover:border-[var(--color-danger-fg)] transition-all disabled:opacity-50"
                >
                  {deleting === release.id ? '删除中' : '删除'}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PackagesTable({ packages, jenkinsConfigs, onDelete, deleting, onConfigJenkins }: {
  packages: Package[];
  jenkinsConfigs: Record<number, JenkinsConfig>;
  onDelete: (id: number) => void;
  deleting: number | null;
  onConfigJenkins: (pkg: Package) => void;
}) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--color-fg-muted)] text-sm">
        暂无软件包，点击右上角「新建软件包」创建
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--color-border-default)] text-left">
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">名称</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">描述</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">日期</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider text-right">操作</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-border-muted)]">
        {packages.map((pkg) => (
          <tr key={pkg.id} className="hover:bg-[var(--color-canvas-default)] transition-colors">
            <td className="px-4 py-3 font-mono font-medium text-[var(--color-accent-fg)]">{pkg.name}</td>
            <td className="px-4 py-3 text-[var(--color-fg-muted)]">{pkg.description || '-'}</td>
            <td className="px-4 py-3 text-[var(--color-fg-muted)]">{formatDate(pkg.created_at)}</td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => onConfigJenkins(pkg)}
                  className={`text-xs px-3 py-1 rounded-md border transition-all ${
                    jenkinsConfigs[pkg.id]
                      ? 'border-[var(--color-success-fg)] text-[var(--color-success-fg)] hover:bg-[rgba(63,185,80,0.1)]'
                      : 'border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)]'
                  }`}
                >
                  {jenkinsConfigs[pkg.id] ? '⚙️ 已配置' : '⚙️ 配置发版'}
                </button>
                <button
                  onClick={() => onDelete(pkg.id)}
                  disabled={deleting === pkg.id}
                  className="text-xs px-3 py-1 rounded-md border border-[var(--color-border-default)] text-[var(--color-danger-fg)] hover:border-[var(--color-danger-fg)] transition-all disabled:opacity-50"
                >
                  {deleting === pkg.id ? '删除中' : '删除'}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PackageModal({ onAdded }: { onAdded: (pkg: Package) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [homepage, setHomepage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const pkg = await createPackage({ name, description, homepage });
      onAdded(pkg);
      setOpen(false);
      setName('');
      setDescription('');
      setHomepage('');
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-4 py-2 rounded-lg bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white transition-colors"
      >
        + 新建软件包
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md border border-[var(--color-border-default)] rounded-xl" style={{ background: 'var(--color-canvas-subtle)' }}>
            <div className="px-5 py-4 border-b border-[var(--color-border-default)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-fg-default)]">新建软件包</h3>
              <button onClick={() => setOpen(false)} className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-fg-default)] mb-1">名称 *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]" style={{ background: 'var(--color-canvas-default)' }} />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-fg-default)] mb-1">描述</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]" style={{ background: 'var(--color-canvas-default)' }} />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-fg-default)] mb-1">主页</label>
                <input value={homepage} onChange={(e) => setHomepage(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]" style={{ background: 'var(--color-canvas-default)' }} />
              </div>
              {error && <p className="text-xs text-[var(--color-danger-fg)]">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 text-sm border border-[var(--color-border-default)] rounded-lg text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] transition-all">取消</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white rounded-lg transition-colors disabled:opacity-60">
                  {loading ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function UsersTable({ users, onDelete, deleting, onAdded }: {
  users: User[];
  onDelete: (id: number) => void;
  deleting: number | null;
  onAdded: (user: User) => void;
}) {
  return (
    <>
      <div className="p-4 flex justify-end">
        <UserModal onAdded={onAdded} />
      </div>
      {users.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-fg-muted)] text-sm">
          暂无用户，点击右上角「新建用户」创建
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-default)] text-left">
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">用户名</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">角色</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">创建时间</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-muted)]">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-[var(--color-canvas-default)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--color-fg-default)]">{user.username}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    user.role === 'admin'
                      ? 'border-[var(--color-accent-fg)] text-[var(--color-accent-fg)]'
                      : 'border-[var(--color-fg-muted)] text-[var(--color-fg-muted)]'
                  }`}>
                    {user.role === 'admin' ? '管理员' : '普通用户'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-fg-muted)]">{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(user.id)}
                    disabled={deleting === user.id}
                    className="text-xs px-3 py-1 rounded-md border border-[var(--color-border-default)] text-[var(--color-danger-fg)] hover:border-[var(--color-danger-fg)] transition-all disabled:opacity-50"
                  >
                    {deleting === user.id ? '删除中' : '删除'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function UserModal({ onAdded }: { onAdded: (user: User) => void }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createUser({ username, password, role });
      // Refresh the users list since API returns empty body
      const users = await getAdminUsers();
      onAdded(users[0]); // The newly created user will be first (sorted by created_at DESC)
      setOpen(false);
      setUsername('');
      setPassword('');
      setRole('user');
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-4 py-2 rounded-lg bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white transition-colors"
      >
        + 新建用户
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md border border-[var(--color-border-default)] rounded-xl" style={{ background: 'var(--color-canvas-subtle)' }}>
            <div className="px-5 py-4 border-b border-[var(--color-border-default)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-fg-default)]">新建用户</h3>
              <button onClick={() => setOpen(false)} className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-fg-default)] mb-1">用户名 *</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
                  style={{ background: 'var(--color-canvas-default)' }}
                  placeholder="输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-fg-default)] mb-1">密码 *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
                  style={{ background: 'var(--color-canvas-default)' }}
                  placeholder="输入密码（至少6位）"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-fg-default)] mb-1">角色</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
                  style={{ background: 'var(--color-canvas-default)' }}
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              {error && <p className="text-xs text-[var(--color-danger-fg)]">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 text-sm border border-[var(--color-border-default)] rounded-lg text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] transition-all">取消</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white rounded-lg transition-colors disabled:opacity-60">
                  {loading ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function JenkinsConfigModal({ pkg, existingConfig, onSaved, onDeleted, onClose }: {
  pkg: Package;
  existingConfig?: JenkinsConfig;
  onSaved: (config: JenkinsConfig) => void;
  onDeleted: (pkgId: number) => void;
  onClose: () => void;
}) {
  const [jenkinsUrl, setJenkinsUrl] = useState(existingConfig?.jenkins_url || '');
  const [jobName, setJobName] = useState(existingConfig?.job_name || '');
  const [username, setUsername] = useState(existingConfig?.username || '');
  const [apiToken, setApiToken] = useState(existingConfig?.api_token || '');
  const [artifactPattern, setArtifactPattern] = useState(existingConfig?.artifact_pattern || '*.zip');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const config = await saveJenkinsConfig({
        package_id: pkg.id,
        jenkins_url: jenkinsUrl,
        job_name: jobName,
        username,
        api_token: apiToken,
        artifact_pattern: artifactPattern,
      });
      onSaved(config);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteJenkinsConfig(pkg.id);
      onDeleted(pkg.id);
    } catch (err: any) {
      setError(err.response?.data?.error || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md border border-[var(--color-border-default)] rounded-xl" style={{ background: 'var(--color-canvas-subtle)' }}>
        <div className="px-5 py-4 border-b border-[var(--color-border-default)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-fg-default)]">配置 Jenkins 发版</h3>
            <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">{pkg.name}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-fg-default)] mb-1">Jenkins 地址 *</label>
            <input
              value={jenkinsUrl}
              onChange={(e) => setJenkinsUrl(e.target.value)}
              required
              placeholder="https://jenkins.example.com"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
              style={{ background: 'var(--color-canvas-default)' }}
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-fg-default)] mb-1">Job 名称 *</label>
            <input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              required
              placeholder="my-app-build"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
              style={{ background: 'var(--color-canvas-default)' }}
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-fg-default)] mb-1">用户名 *</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Jenkins 用户名"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
              style={{ background: 'var(--color-canvas-default)' }}
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-fg-default)] mb-1">API Token *</label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              required
              placeholder="Jenkins 用户 API Token"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
              style={{ background: 'var(--color-canvas-default)' }}
            />
            <p className="text-xs text-[var(--color-fg-muted)] mt-1">
              在 Jenkins 用户设置页生成：Jenkins → 用户 → Configure → API Token
            </p>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-fg-default)] mb-1">产物匹配规则</label>
            <input
              value={artifactPattern}
              onChange={(e) => setArtifactPattern(e.target.value)}
              placeholder="*.zip"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
              style={{ background: 'var(--color-canvas-default)' }}
            />
            <p className="text-xs text-[var(--color-fg-muted)] mt-1">
              支持通配符，如 <code className="px-1 rounded bg-[var(--color-canvas-default)]">*.zip</code> 或 <code className="px-1 rounded bg-[var(--color-canvas-default)]">app-*.zip</code>
            </p>
          </div>
          {error && <p className="text-xs text-[var(--color-danger-fg)]">{error}</p>}
          <div className="flex gap-3 pt-2">
            {existingConfig && (
              !showDeleteConfirm ? (
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex-1 py-2 text-sm border border-[var(--color-danger-fg)] rounded-lg text-[var(--color-danger-fg)] hover:bg-[rgba(248,81,73,0.1)] transition-all">
                  删除配置
                </button>
              ) : (
                <button type="button" onClick={handleDelete} disabled={loading} className="flex-1 py-2 text-sm border border-[var(--color-danger-fg)] rounded-lg text-[var(--color-danger-fg)] hover:bg-[rgba(248,81,73,0.1)] transition-all">
                  确认删除？
                </button>
              )
            )}
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-[var(--color-border-default)] rounded-lg text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] transition-all">取消</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white rounded-lg transition-colors disabled:opacity-60">
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
