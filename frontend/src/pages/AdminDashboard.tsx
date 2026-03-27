import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ReleaseButton } from "@/components/ui/release-button";
import { HoverTabs } from "@/components/ui/hover-tabs";
import { AnimatedTableRow } from "@/components/ui/animated-table";
import {
  getAdminReleases,
  getAdminPackages,
  getAdminStats,
  deleteRelease,
  deletePackage,
  createPackage,
  updatePackage,
  getAdminUsers,
  createUser,
  deleteUser,
  getJenkinsConfigs,
  saveJenkinsConfig,
  deleteJenkinsConfig,
  triggerUnifiedRelease,
  triggerSingleRelease,
  getJenkinsBuildSession,
  getJenkinsBuildActive,
  getAdminReleases as reloadReleases,
  getAdminStats as reloadStats,
} from '../services/api';
import type { Release, Package, AdminStats, User, JenkinsConfig, BuildSession } from '../types';
import { ChevronDown, ChevronUp, Rocket, Loader2, CheckCircle2, XCircle, Clock, Download, AlertCircle } from 'lucide-react';
import { SimpleDialog } from '../components/ui/form-dialog';
import { FormDialog } from '../components/ui/form-dialog';
import { useToast } from '../components/ui/toast';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// 可折叠的构建进度面板组件
function BuildProgressPanel({
  buildSession,
  buildLoading,
  buildError,
  isCollapsed,
  onToggleCollapse,
  onClose,
  onMinimize
}: {
  buildSession: BuildSession | null;
  buildLoading: boolean;
  buildError: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const completedCount = buildSession?.packages.filter(p => p.status === 'completed').length || 0;
  const totalCount = buildSession?.packages.length || 0;
  const failedCount = buildSession?.packages.filter(p => p.status === 'failed').length || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'building': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'downloading': return <Download className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'triggering': return <Rocket className="w-4 h-4 text-orange-500 animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'triggering': return '触发中';
      case 'building': return '构建中';
      case 'downloading': return '下载产物';
      case 'completed': return '完成';
      case 'failed': return '失败';
      default: return '未知';
    }
  };

  return (
    <AnimatePresence>
      {(buildSession || buildLoading || buildError) && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <motion.div
            layout
            className="border rounded-xl shadow-2xl overflow-hidden"
            style={{
              background: 'var(--color-canvas-subtle)',
              borderColor: 'var(--color-border-default)',
              width: isCollapsed ? '280px' : '360px',
              maxHeight: isCollapsed ? 'none' : '70vh'
            }}
          >
            {/* 头部 */}
            <motion.div
              layout
              className="px-4 py-3 border-b flex items-center justify-between cursor-pointer"
              style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-canvas-default)' }}
              onClick={onToggleCollapse}
            >
              <div className="flex items-center gap-2">
                {buildLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#6C3FF5' }} />
                ) : buildSession?.overall_status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : buildSession?.overall_status === 'failed' ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Rocket className="w-4 h-4" style={{ color: '#6C3FF5' }} />
                )}
                <span className="text-sm font-medium text-[var(--color-fg-default)]">
                  {buildLoading ? '正在发版中' : buildSession?.overall_status === 'completed' ? '发版完成' : buildSession?.overall_status === 'failed' ? '发版异常' : '一键发版'}
                </span>
                {buildSession && !isCollapsed && (
                  <span className="text-xs text-[var(--color-fg-muted)]">
                    {completedCount}/{totalCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isCollapsed && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="p-1 rounded hover:bg-[var(--color-canvas-subtle)] mr-1"
                  >
                    <XCircle className="w-4 h-4 text-[var(--color-fg-muted)]" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); isCollapsed ? onToggleCollapse() : onMinimize(); }}
                  className="p-1 rounded hover:bg-[var(--color-canvas-subtle)]"
                >
                  <motion.div
                    animate={{ rotate: isCollapsed ? 0 : 180 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronUp className="w-4 h-4 text-[var(--color-fg-muted)]" />
                  </motion.div>
                </button>
              </div>
            </motion.div>

            {/* 内容区域 */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 space-y-3 overflow-y-auto"
                >
                {buildError && (
                  <div className="text-sm text-[var(--color-danger-fg)] bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-lg px-4 py-3">
                    {buildError}
                  </div>
                )}

                {buildLoading && !buildSession && (
                  <div className="flex items-center gap-3 py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-6 h-6" style={{ color: '#6C3FF5' }} />
                    </motion.div>
                    <span className="text-sm text-[var(--color-fg-muted)]">正在启动发版任务...</span>
                  </div>
                )}

                {buildSession && (
                  <div className="space-y-2">
                    {buildSession.packages.map((pkg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border border-[var(--color-border-default)] rounded-lg p-3"
                        style={{ background: 'var(--color-canvas-default)' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(pkg.status)}
                            <span className="text-sm font-medium text-[var(--color-fg-default)]">{pkg.package_name}</span>
                            {pkg.build_number && (
                              <span className="text-xs text-[var(--color-fg-muted)] font-mono">#{pkg.build_number}</span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            pkg.status === 'completed' ? 'bg-green-100 text-green-700' :
                            pkg.status === 'failed' ? 'bg-red-100 text-red-700' :
                            pkg.status === 'downloading' ? 'bg-blue-100 text-blue-700' :
                            pkg.status === 'building' ? 'bg-blue-100 text-blue-700' :
                            pkg.status === 'triggering' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getStatusText(pkg.status)}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-canvas-subtle)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pkg.progress}%` }}
                            className="h-full rounded-full"
                            style={{
                              background: pkg.status === 'failed' ? 'var(--color-danger-fg)' : pkg.status === 'completed' ? 'var(--color-success-fg)' : '#6C3FF5'
                            }}
                          />
                        </div>
                        {pkg.error && (
                          <p className="text-xs text-[var(--color-danger-fg)] mt-1">{pkg.error}</p>
                        )}
                      </motion.div>
                    ))}

                    {buildSession.overall_status !== 'running' && (
                      <div className={`text-sm text-center py-2 rounded-lg ${
                        buildSession.overall_status === 'completed'
                          ? 'text-green-600 bg-green-50'
                          : 'text-red-600 bg-red-50'
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
                    onClick={onClose}
                    className="w-full py-2 text-sm border border-[var(--color-border-default)] rounded-lg text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] transition-all"
                  >
                    关闭
                  </button>
                )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
  const { showToast } = useToast();

  // 删除确认弹框状态
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: 'release' | 'package' | 'user';
    id: number;
    name: string;
  } | null>(null);

  // 一键发版状态
  const [buildSession, setBuildSession] = useState<BuildSession | null>(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);
  const pollBuildSessionRef = useRef<((sessionId: string) => void) | null>(null);
  const isRestoredRef = useRef(false);

  // 统一发版包选择弹框状态
  const [packageSelectOpen, setPackageSelectOpen] = useState(false);
  const [selectedPackageIds, setSelectedPackageIds] = useState<number[]>([]);

  // 保存状态到 localStorage
  useEffect(() => {
    if (buildSession) {
      localStorage.setItem('build-session', JSON.stringify(buildSession));
    }
  }, [buildSession]);

  useEffect(() => {
    localStorage.setItem('build-loading', String(buildLoading));
    if (!buildLoading) {
      localStorage.removeItem('build-loading');
    }
  }, [buildLoading]);

  // 检查是否有未完成的构建会话 - 页面加载时从数据库恢复
  useEffect(() => {
    // Prevent double restoration in React StrictMode
    if (isRestoredRef.current) return;
    isRestoredRef.current = true;

    // 从数据库获取活动会话
    getJenkinsBuildActive()
      .then((activeSession) => {
        // 无论状态是什么，都获取最新状态并显示
        if (activeSession) {
          setBuildSession(activeSession);
          setIsPanelCollapsed(false);

          // 如果状态是 running，继续轮询；否则显示完成状态
          if (activeSession.overall_status === 'running') {
            setBuildLoading(true);

            // 直接启动轮询（不依赖 ref）
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            pollIntervalRef.current = window.setInterval(async () => {
              try {
                const session = await getJenkinsBuildSession(activeSession.id);
                setBuildSession(session);
                if (session.overall_status !== 'running') {
                  if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                  }
                  setBuildLoading(false);
                  localStorage.removeItem('build-session');
                  localStorage.removeItem('build-loading');
                  if (session.overall_status === 'completed') {
                    load();
                  }
                }
              } catch (err: any) {
                if (err.response?.status === 404 || err.response?.status === 500) {
                  if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                  }
                  setBuildSession(null);
                  setBuildLoading(false);
                  localStorage.removeItem('build-session');
                  localStorage.removeItem('build-loading');
                }
              }
            }, 3000);
          } else {
            // 已完成或失败，也刷新数据
            setBuildLoading(false);
            if (activeSession.overall_status === 'completed') {
              load();
            }
          }
        }
      })
      .catch(() => {
        // 忽略错误，可能是没有活动会话
      });
  }, []);

  const [jenkinsConfigModal, setJenkinsConfigModal] = useState<{ open: boolean; pkg: Package | null }>({ open: false, pkg: null });
  const [editPackageModal, setEditPackageModal] = useState<{ open: boolean; pkg: Package | null }>({ open: false, pkg: null });

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

  const handleDeleteRelease = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'release') return;
    setDeleting(deleteConfirm.id);
    try {
      await deleteRelease(deleteConfirm.id);
      setReleases((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
      showToast('success', '版本删除成功');
    } catch {
      showToast('error', '删除失败');
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  const handleDeletePackage = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'package') return;
    setDeleting(deleteConfirm.id);
    try {
      await deletePackage(deleteConfirm.id);
      setPackages((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
      showToast('success', '软件包删除成功');
    } catch {
      showToast('error', '删除失败');
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'user') return;
    setDeleting(deleteConfirm.id);
    try {
      await deleteUser(deleteConfirm.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteConfirm.id));
      showToast('success', '用户删除成功');
    } catch (err: any) {
      showToast('error', err.response?.data?.error || '删除失败');
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  // 统一发版
  const handleUnifiedRelease = async (selectedPackageIds?: number[]) => {
    setBuildError('');
    setBuildLoading(true);
    try {
      const result = await triggerUnifiedRelease(selectedPackageIds);
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

  // 单包发版
  const handleSingleRelease = async (packageId: number) => {
    setBuildError('');
    setBuildLoading(true);
    try {
      const result = await triggerSingleRelease(packageId);
      if (result.status === 'queued' || result.status === 'building' || result.status === 'completed') {
        // 如果有 session_id，说明是异步的
        if (result.session_id) {
          setBuildSession({
            id: result.session_id,
            tag_name: result.tag_name,
            created_at: new Date().toISOString(),
            packages: [],
            overall_status: 'running',
            release_id: null,
          });
          pollBuildSession(result.session_id);
        } else {
          // 同步完成的
          setBuildLoading(false);
          showToast('success', `单包发版完成，版本 ${result.tagName}`);
          load();
        }
      }
    } catch (err: any) {
      setBuildError(err.response?.data?.error || err.message);
      setBuildLoading(false);
    }
  };

  const pollBuildSession = (sessionId: string) => {
    // Store ref for restoration after page refresh
    pollBuildSessionRef.current = pollBuildSession;

    // Clear existing interval if any
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const session = await getJenkinsBuildSession(sessionId);
        setBuildSession(session);
        if (session.overall_status !== 'running') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setBuildLoading(false);
          // Clear localStorage when done
          localStorage.removeItem('build-session');
          localStorage.removeItem('build-loading');
          // Refresh data when done
          if (session.overall_status === 'completed') {
            load();
          }
        }
      } catch (err: any) {
        // Session not found or error - clear state
        if (err.response?.status === 404 || err.response?.status === 500) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setBuildSession(null);
          setBuildLoading(false);
          setBuildError('');
          localStorage.removeItem('build-session');
          localStorage.removeItem('build-loading');
        }
      }
    }, 3000);

    // Auto-stop after 10 minutes
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setBuildLoading(false);
    }, 600000);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas-default)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent-emphasis)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-canvas-default)' }}>
      {/* 删除确认弹框 */}
      <SimpleDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title={
          deleteConfirm?.type === 'release' ? '确定删除版本？' :
          deleteConfirm?.type === 'package' ? '确定删除软件包？' :
          '确定删除用户？'
        }
        description={
          deleteConfirm?.type === 'release' ? '此操作不可撤销，删除后该版本将从系统中永久移除。' :
          deleteConfirm?.type === 'package' ? '删除软件包将同时删除所有关联的版本，此操作不可撤销。' :
          '确定要删除该用户吗？'
        }
      >
        <div className="flex gap-2">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="flex-1 py-2 text-sm border rounded-lg transition-all"
            style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-fg-muted)' }}
          >
            取消
          </button>
          <button
            onClick={() => {
              if (deleteConfirm?.type === 'release') handleDeleteRelease();
              else if (deleteConfirm?.type === 'package') handleDeletePackage();
              else if (deleteConfirm?.type === 'user') handleDeleteUser();
            }}
            disabled={!!deleting}
            className="flex-1 py-2 text-sm rounded-lg transition-all disabled:opacity-50"
            style={{ background: '#F85149', color: 'white' }}
          >
            {deleting ? '删除中...' : '确认删除'}
          </button>
        </div>
      </SimpleDialog>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: '版本总数', value: stats.totalReleases, color: '#6C3FF5' },
              { label: '软件包', value: stats.totalPackages, color: '#1a7f37' },
              { label: '下载次数', value: Number(stats.totalDownloads).toLocaleString(), color: '#6C3FF5' },
              { label: '草稿版本', value: stats.draftReleases, color: '#57606a' },
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
          <HoverTabs activeTab={tab} onTabChange={setTab} />
          {tab === 'releases' && (
            <div className="flex gap-2">
              <ReleaseButton
                onClick={() => {
                  // 默认全选所有配置了 Jenkins 的包
                  setSelectedPackageIds(Object.keys(jenkinsConfigs).map(Number));
                  setPackageSelectOpen(true);
                }}
                disabled={buildLoading || buildSession?.overall_status === 'running' || Object.keys(jenkinsConfigs).length === 0}
                loading={buildLoading || buildSession?.overall_status === 'running'}
                label="一键发版"
              />
              <Link
                to="/admin/releases/new"
                className="text-xs px-4 py-2 rounded-lg text-white transition-all no-underline animate-fade-in"
                style={{ background: '#6C3FF5' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#5B35E0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#6C3FF5'}
              >
                + 新建版本
              </Link>
            </div>
          )}
          {tab === 'packages' && (
            <PackageModal onAdded={(pkg) => setPackages((prev) => [...prev, pkg])} />
          )}
          {tab === 'users' && (
            <UserModal onAdded={(user) => setUsers((prev) => [...prev, user])} />
          )}
        </div>

        {/* Table */}
        <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden" style={{ background: 'var(--color-canvas-subtle)' }}>
          {tab === 'releases' ? (
            <ReleasesTable
              releases={releases}
              onDelete={(id) => setDeleteConfirm({ open: true, type: 'release', id, name: '' })}
              deleting={deleting}
            />
          ) : tab === 'packages' ? (
            <PackagesTable
              packages={packages}
              jenkinsConfigs={jenkinsConfigs}
              onDelete={(id) => setDeleteConfirm({ open: true, type: 'package', id, name: '' })}
              deleting={deleting}
              onConfigJenkins={(pkg) => setJenkinsConfigModal({ open: true, pkg })}
              onSingleRelease={(pkgId) => handleSingleRelease(pkgId)}
              onEditPackage={(pkg) => setEditPackageModal({ open: true, pkg })}
            />
          ) : (
            <UsersTable
              users={users}
              onDelete={(id) => setDeleteConfirm({ open: true, type: 'user', id, name: '' })}
              deleting={deleting}
            />
          )}
        </div>

        {/* 一键发版进度面板 - 可折叠 */}
        <BuildProgressPanel
          buildSession={buildSession}
          buildLoading={buildLoading}
          buildError={buildError}
          isCollapsed={isPanelCollapsed}
          onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
          onClose={() => {
            setBuildSession(null);
            setBuildError('');
            localStorage.removeItem('build-session');
            localStorage.removeItem('build-error');
          }}
          onMinimize={() => setIsPanelCollapsed(true)}
        />

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

        {/* 编辑软件包弹窗 */}
        {editPackageModal.open && editPackageModal.pkg && (
          <EditPackageModal
            pkg={editPackageModal.pkg}
            onSaved={(updatedPkg) => {
              setPackages((prev) => prev.map((p) => p.id === updatedPkg.id ? updatedPkg : p));
              setEditPackageModal({ open: false, pkg: null });
            }}
            onClose={() => setEditPackageModal({ open: false, pkg: null })}
          />
        )}

        {/* 统一发版包选择弹窗 */}
        <SimpleDialog
          open={packageSelectOpen}
          onOpenChange={(open) => !open && setPackageSelectOpen(false)}
          title="统一发版"
          description="选择要发版的软件包（统一使用同一版本号）"
        >
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {packages.filter(p => jenkinsConfigs[p.id]).map((pkg) => (
              <label
                key={pkg.id}
                className="flex items-center gap-3 p-2 rounded-lg border border-[var(--color-border-default)] cursor-pointer hover:bg-[var(--color-canvas-subtle)] transition-all"
              >
                <input
                  type="checkbox"
                  checked={selectedPackageIds.includes(pkg.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPackageIds([...selectedPackageIds, pkg.id]);
                    } else {
                      setSelectedPackageIds(selectedPackageIds.filter(id => id !== pkg.id));
                    }
                  }}
                  className="w-4 h-4 rounded border-[var(--color-border-default)]"
                />
                <span className="font-mono text-sm">{pkg.name}</span>
                {pkg.description && (
                  <span className="text-xs text-[var(--color-fg-muted)] truncate">{pkg.description}</span>
                )}
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setPackageSelectOpen(false)}
              className="flex-1 py-2 text-sm border rounded-lg transition-all"
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-fg-muted)' }}
            >
              取消
            </button>
            <button
              onClick={() => {
                if (selectedPackageIds.length > 0) {
                  setPackageSelectOpen(false);
                  handleUnifiedRelease(selectedPackageIds);
                }
              }}
              disabled={selectedPackageIds.length === 0}
              className="flex-1 py-2 text-sm rounded-lg transition-all disabled:opacity-50"
              style={{ background: '#6C3FF5', color: 'white' }}
            >
              确认发版
            </button>
          </div>
        </SimpleDialog>
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
        {releases.map((release, index) => (
          <AnimatedTableRow key={release.id} index={index}>
            <td className="px-4 py-3">
              <div className="font-mono font-medium" style={{ color: '#6C3FF5' }}>{release.tag_name}</div>
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
                  className="text-xs px-3 py-1 rounded-md border text-[var(--color-fg-muted)] hover:text-[#6C3FF5] hover:border-[#6C3FF5] transition-all no-underline"
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
          </AnimatedTableRow>
        ))}
      </tbody>
    </table>
  );
}

function PackagesTable({ packages, jenkinsConfigs, onDelete, deleting, onConfigJenkins, onSingleRelease, onEditPackage }: {
  packages: Package[];
  jenkinsConfigs: Record<number, JenkinsConfig>;
  onDelete: (id: number) => void;
  deleting: number | null;
  onConfigJenkins: (pkg: Package) => void;
  onSingleRelease: (pkgId: number) => void;
  onEditPackage: (pkg: Package) => void;
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
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">别名</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">描述</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider">日期</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider text-right">操作</th>
          <th className="px-4 py-3 text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wider text-right">发版</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-border-muted)]">
        {packages.map((pkg, index) => (
          <AnimatedTableRow key={pkg.id} index={index}>
            <td className="px-4 py-3 font-mono font-medium" style={{ color: '#6C3FF5' }}>{pkg.name}</td>
            <td className="px-4 py-3 text-[var(--color-fg-muted)]">{pkg.alias || '-'}</td>
            <td className="px-4 py-3 text-[var(--color-fg-muted)]">{pkg.description || '-'}</td>
            <td className="px-4 py-3 text-[var(--color-fg-muted)]">{formatDate(pkg.created_at)}</td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => onEditPackage(pkg)}
                  className="text-xs px-3 py-1 rounded-md border border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[#6C3FF5] hover:text-[#6C3FF5] transition-all"
                >
                  ✏️ 编辑
                </button>
                <button
                  onClick={() => onConfigJenkins(pkg)}
                  className={`text-xs px-3 py-1 rounded-md border transition-all ${
                    jenkinsConfigs[pkg.id]
                      ? 'border-[var(--color-success-fg)] text-[var(--color-success-fg)] hover:bg-[rgba(63,185,80,0.1)]'
                      : 'border-[var(--color-border-default)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)]'
                  }`}
                >
                  {jenkinsConfigs[pkg.id] ? '⚙️ 已配置' : '⚙️ 配置'}
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
            <td className="px-4 py-3 text-right">
              {jenkinsConfigs[pkg.id] ? (
                <button
                  onClick={() => onSingleRelease(pkg.id)}
                  className="text-xs px-3 py-1 rounded-md border border-[#6C3FF5] text-[#6C3FF5] hover:bg-[rgba(108,63,245,0.1)] transition-all"
                >
                  🚀 发版
                </button>
              ) : (
                <span className="text-xs text-[var(--color-fg-muted)]">未配置</span>
              )}
            </td>
          </AnimatedTableRow>
        ))}
      </tbody>
    </table>
  );
}

function PackageModal({ onAdded }: { onAdded: (pkg: Package) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const pkg = await createPackage({
        name: values.name,
        description: values.description,
        homepage: values.homepage
      });
      onAdded(pkg);
      showToast('success', '软件包创建成功');
      setOpen(false);
    } catch (err: any) {
      showToast('error', err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="新建软件包"
      fields={[
        { id: 'name', label: '名称', type: 'text', placeholder: '输入软件包名称', required: true },
        { id: 'description', label: '描述', type: 'text', placeholder: '输入软件包描述' },
        { id: 'homepage', label: '主页', type: 'url', placeholder: 'https://...' },
      ]}
      onSubmit={handleSubmit}
      submitText="创建"
      loading={loading}
      trigger={
        <button
          className="text-xs px-4 py-2 rounded-lg text-white transition-all animate-fade-in"
          style={{ background: '#6C3FF5' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#5B35E0'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#6C3FF5'}
        >
          + 新建软件包
        </button>
      }
    />
  );
}

function UsersTable({ users, onDelete, deleting }: {
  users: User[];
  onDelete: (id: number) => void;
  deleting: number | null;
}) {
  return (
    <>
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
            {users.map((user, index) => (
              <AnimatedTableRow key={user.id} index={index}>
                <td className="px-4 py-3 font-medium text-[var(--color-fg-default)]">{user.username}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    user.role === 'admin'
                      ? 'border-[#6C3FF5] text-[#6C3FF5]'
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
              </AnimatedTableRow>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function UserModal({ onAdded }: { onAdded: (user: User) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      await createUser({
        username: values.username,
        password: values.password,
        role: values.role
      });
      // Refresh the users list since API returns empty body
      const users = await getAdminUsers();
      onAdded(users[0]); // The newly created user will be first (sorted by created_at DESC)
      showToast('success', '用户创建成功');
      setOpen(false);
    } catch (err: any) {
      showToast('error', err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="新建用户"
      fields={[
        { id: 'username', label: '用户名', type: 'text', placeholder: '输入用户名', required: true },
        { id: 'password', label: '密码', type: 'password', placeholder: '输入密码（至少6位）', required: true },
        {
          id: 'role',
          label: '角色',
          type: 'select',
          required: true,
          defaultValue: 'user',
          options: [
            { value: 'user', label: '普通用户' },
            { value: 'admin', label: '管理员' },
          ]
        },
      ]}
      onSubmit={handleSubmit}
      submitText="创建"
      loading={loading}
      trigger={
        <button
          className="text-xs px-4 py-2 rounded-lg text-white transition-all animate-fade-in"
          style={{ background: '#6C3FF5' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#5B35E0'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#6C3FF5'}
        >
          + 新建用户
        </button>
      }
    />
  );
}

function JenkinsConfigModal({ pkg, existingConfig, onSaved, onDeleted, onClose }: {
  pkg: Package;
  existingConfig?: JenkinsConfig;
  onSaved: (config: JenkinsConfig) => void;
  onDeleted: (pkgId: number) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const config = await saveJenkinsConfig({
        package_id: pkg.id,
        jenkins_url: values.jenkins_url,
        job_name: values.job_name,
        username: values.username,
        api_token: values.api_token,
        artifact_pattern: values.artifact_pattern,
      });
      onSaved(config);
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteJenkinsConfig(pkg.id);
      onDeleted(pkg.id);
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { id: 'jenkins_url', label: 'Jenkins 地址', type: 'url' as const, placeholder: 'https://jenkins.example.com', required: true },
    { id: 'job_name', label: 'Job 名称', type: 'text' as const, placeholder: 'my-app-build', required: true },
    { id: 'username', label: '用户名', type: 'text' as const, placeholder: 'Jenkins 用户名', required: true },
    { id: 'api_token', label: 'API Token', type: 'password' as const, placeholder: 'Jenkins 用户 API Token', required: true },
    { id: 'artifact_pattern', label: '产物匹配规则', type: 'text' as const, placeholder: '*.zip', defaultValue: '*.zip' },
  ];

  const initialValues: Record<string, string> = {};
  fields.forEach(f => {
    initialValues[f.id] = f.id === 'artifact_pattern' ? (existingConfig?.artifact_pattern || '*.zip') :
      existingConfig?.[f.id as keyof JenkinsConfig] as string || '';
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && handleClose()}
      title="配置 Jenkins 发版"
      description={pkg.name}
      fields={fields}
      defaultValues={initialValues}
      onSubmit={handleSubmit}
      submitText="保存"
      loading={loading}
      extraFooter={
        existingConfig && (
          <div className="flex gap-2 w-full">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 py-2 text-sm border border-[var(--color-danger-fg)] rounded-lg text-[var(--color-danger-fg)] hover:bg-[rgba(248,81,73,0.1)] transition-all"
              >
                删除配置
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2 text-sm border border-[var(--color-danger-fg)] rounded-lg text-[var(--color-danger-fg)] hover:bg-[rgba(248,81,73,0.1)] transition-all"
              >
                确认删除？
              </button>
            )}
          </div>
        )
      }
    />
  );
}

function EditPackageModal({ pkg, onSaved, onClose }: {
  pkg: Package;
  onSaved: (pkg: Package) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const updatedPkg = await updatePackage(pkg.id, {
        name: values.name,
        description: values.description,
        homepage: values.homepage,
        alias: values.alias,
      });
      onSaved(updatedPkg);
      showToast('success', '软件包更新成功');
      handleClose();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { id: 'name', label: '名称', type: 'text' as const, placeholder: '输入软件包名称', required: true },
    { id: 'alias', label: '别名', type: 'text' as const, placeholder: '输入软件包别名（可选）' },
    { id: 'description', label: '描述', type: 'text' as const, placeholder: '输入软件包描述' },
    { id: 'homepage', label: '主页', type: 'url' as const, placeholder: 'https://...' },
  ];

  const initialValues: Record<string, string> = {
    name: pkg.name,
    alias: pkg.alias || '',
    description: pkg.description || '',
    homepage: pkg.homepage || '',
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && handleClose()}
      title="编辑软件包"
      description={pkg.name}
      fields={fields}
      defaultValues={initialValues}
      onSubmit={handleSubmit}
      submitText="保存"
      loading={loading}
    />
  );
}
