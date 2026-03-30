import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getRelease, downloadAsset, getPackages } from '../services/api';
import type { Release, Package } from '../types';
import { ArrowLeft, Download, ExternalLink, Folder } from 'lucide-react';
import { TreeView, TreeNode } from '../components/ui/tree-view';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = {
    zip: '📦', tar: '📦', gz: '📦',
    exe: '⚙️', msi: '⚙️', dmg: '🍎', pkg: '🍎',
    deb: '🐧', rpm: '🐧', AppImage: '🐧',
    jar: '☕', apk: '🤖', aab: '🤖',
    wasm: '🌐', js: '🌐', npm: '📦',
  };
  return icons[ext || ''] || '📄';
}

function parseMarkdown(text: string) {
  if (!text) return '';
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hl])/gm, '')
    .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>');
}

export default function ReleaseDetail() {
  const { tag } = useParams();
  const location = useLocation();
  const [release, setRelease] = useState<Release | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set());

  const toggleAssetSelection = (assetId: number) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedAssets.size === release?.assets?.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(release?.assets?.map(a => a.id) || []));
    }
  };

  const handleDownloadSelected = () => {
    selectedAssets.forEach(assetId => {
      downloadAsset(assetId);
    });
  };

  useEffect(() => {
    if (!tag) return;
    Promise.all([getRelease(tag), getPackages()])
      .then(([r, p]) => {
        setRelease(r);
        setPackages(p);
      })
      .catch(() => setError('版本不存在'))
      .finally(() => setLoading(false));
  }, [tag]);

  // Get package alias map
  const packageAliasMap = {};
  packages.forEach((pkg) => {
    packageAliasMap[pkg.name] = pkg.alias || pkg.name;
  });

  // Get display name for a package
  const getDisplayName = (pkgName) => {
    return packageAliasMap[pkgName] || pkgName;
  };

  const handleDownload = (assetId: number) => {
    setDownloading(assetId);
    downloadAsset(assetId);
    setTimeout(() => setDownloading(null), 1000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex items-center justify-center relative">
        <div className="w-10 h-10 border-2 border-[#6C3FF5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center relative">
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-canvas-subtle) 0%, rgba(108,63,245,0.1) 100%)' }}>
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-xl font-bold mb-2">版本未找到</h1>
          <p className="text-[var(--color-fg-muted)] mb-4">抱歉，找不到该版本的信息</p>
          <Link to="/" state={{ fromDetail: true }} className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-lg text-white transition-all" style={{ background: '#6C3FF5' }}>
            <ArrowLeft className="w-4 h-4" />
            返回版本列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      {/* Content */}
      <div className="relative z-10">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-[var(--color-fg-muted)] hover:text-[#6C3FF5] mb-6 no-underline transition-colors animate-fade-in">
          <ArrowLeft className="w-4 h-4" />
          返回版本列表
        </Link>

        {/* Header */}
        <div className="mb-6 animate-fade-in" style={{ borderLeft: '4px solid #6C3FF5', paddingLeft: '16px' }}>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h1 className="font-mono text-2xl font-bold text-[var(--color-fg-default)]">{release.tag_name}</h1>
            {release.is_prerelease === 1 && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-attention-fg)] text-[var(--color-attention-fg)]">
                Pre-release
              </span>
            )}
            {release.is_draft === 1 && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-fg-muted)] text-[var(--color-fg-muted)]">
                Draft
              </span>
            )}
          </div>
          {release.title && (
            <h2 className="text-lg text-[var(--color-fg-muted)] font-normal mb-3">{release.title}</h2>
          )}
          <div className="flex items-center gap-3 text-sm text-[var(--color-fg-muted)]">
            <span>{getDisplayName(release.package_name)}</span>
            <span>·</span>
            <span>{formatDate(release.created_at)}</span>
            {release.homepage && (
              <>
                <span>·</span>
                <a href={release.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#6C3FF5] transition-colors">
                  项目主页 <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Changelog */}
          <div className="lg:col-span-1">
            <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden animate-slide-in">
              <div className="px-5 py-3 border-b border-[var(--color-border-default)]" style={{ background: 'var(--color-canvas-subtle)' }}>
                <h3 className="text-sm font-semibold text-[var(--color-fg-default)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#6C3FF5' }} />
                  变更日志
                </h3>
              </div>
              <div className="p-5">
                {release.body ? (
                  <div className="markdown-body" dangerouslySetInnerHTML={{ __html: parseMarkdown(release.body) }} />
                ) : (
                  <p className="text-[var(--color-fg-muted)] text-sm italic">暂无变更日志</p>
                )}
              </div>
            </div>
          </div>

          {/* Downloads */}
          <div>
            <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden sticky top-4 animate-slide-in-right">
              <div className="px-5 py-3 border-b border-[var(--color-border-default)] flex items-center justify-between min-h-[52px]" style={{ background: 'var(--color-canvas-subtle)' }}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={release.assets?.length > 0 && selectedAssets.size === release.assets?.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[var(--color-border-default)] text-[#6C3FF5] focus:ring-[#6C3FF5]"
                  />
                  <h3 className="text-sm font-semibold text-[var(--color-fg-default)] flex items-center gap-2">
                    <Download className="w-4 h-4" style={{ color: '#6C3FF5' }} />
                    Downloads ({release.assets?.length || 0})
                  </h3>
                </div>
                <div className="w-[120px] flex justify-end">
                  <button
                    onClick={handleDownloadSelected}
                    className="text-xs px-3 py-1.5 rounded-lg text-white transition-all"
                    style={{
                      background: '#6C3FF5',
                      opacity: selectedAssets.size > 0 ? 1 : 0,
                      pointerEvents: selectedAssets.size > 0 ? 'auto' : 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#5B35E0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#6C3FF5'}
                  >
                    下载已选 ({selectedAssets.size})
                  </button>
                </div>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {!release.assets || release.assets.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-[var(--color-fg-muted)]">
                    暂无下载文件
                  </div>
                ) : (
                  (() => {
                    // Group assets by package
                    const packageGroups: Record<string, typeof release.assets> = {};
                    release.assets.forEach(asset => {
                      const pkgKey = asset.package_alias || asset.package_name || 'Other';
                      if (!packageGroups[pkgKey]) {
                        packageGroups[pkgKey] = [];
                      }
                      packageGroups[pkgKey].push(asset);
                    });

                    // Build tree data
                    const treeData: TreeNode[] = Object.entries(packageGroups).map(([pkgName, assets]) => ({
                      id: `pkg-${pkgName}`,
                      label: pkgName,
                      icon: <Folder className="h-4 w-4" style={{ color: '#6C3FF5' }} />,
                      children: assets.map(asset => {
                        const pkgNameStr = asset.package_name || '';
                        const pkgAliasStr = asset.package_alias || pkgNameStr;
                        const displayName = pkgNameStr ? asset.name.replace(pkgNameStr, pkgAliasStr) : asset.name;
                        return {
                          id: `asset-${asset.id}`,
                          label: displayName,
                          icon: <span className="text-base">{getFileIcon(asset.name)}</span>,
                          data: { ...asset, displayName },
                        };
                      }),
                    }));

                    return (
                      <TreeView
                        data={treeData}
                        defaultExpandedIds={Object.keys(packageGroups).map(pkg => `pkg-${pkg}`)}
                        showIcons={true}
                        showLines={false}
                        selectable={true}
                        multiSelect={true}
                        selectedAssets={selectedAssets}
                        onSelectionChange={(ids) => {
                          const assetIds = ids
                            .filter(id => id.startsWith('asset-'))
                            .map(id => parseInt(id.replace('asset-', '')));
                          setSelectedAssets(new Set(assetIds));
                        }}
                        onNodeClick={() => {}}
                        onAssetDownload={handleDownload}
                        downloadingAssetId={downloading}
                        className="border-0"
                      />
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
