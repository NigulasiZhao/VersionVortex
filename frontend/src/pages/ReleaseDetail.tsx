import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRelease, downloadAsset } from '../services/api';
import type { Release } from '../types';

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
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    if (!tag) return;
    getRelease(tag)
      .then(setRelease)
      .catch(() => setError('版本不存在'))
      .finally(() => setLoading(false));
  }, [tag]);

  const handleDownload = (assetId: number) => {
    setDownloading(assetId);
    downloadAsset(assetId);
    setTimeout(() => setDownloading(null), 1000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent-emphasis)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-2">版本未找到</h1>
        <p className="text-[var(--color-fg-muted)] mb-4">抱歉，找不到该版本的信息</p>
        <Link to="/" className="text-sm text-[var(--color-accent-fg)] hover:underline">
          ← 返回版本列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] mb-6 no-underline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        返回
      </Link>

      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h1 className="font-mono text-2xl font-bold text-[var(--color-fg-default)]">{release.tag_name}</h1>
          {release.is_prerelease === 1 && (
            <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-attention-fg)] text-[var(--color-attention-fg)]">
              Pre-release
            </span>
          )}
        </div>
        {release.title && (
          <h2 className="text-lg text-[var(--color-fg-muted)] font-normal mb-2">{release.title}</h2>
        )}
        <div className="flex items-center gap-3 text-sm text-[var(--color-fg-muted)]">
          <span>{release.package_name}</span>
          <span>·</span>
          <span>{formatDate(release.created_at)}</span>
          {release.homepage && (
            <>
              <span>·</span>
              <a href={release.homepage} target="_blank" rel="noopener noreferrer" className="hover:underline">
                主页
              </a>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Changelog */}
        <div className="lg:col-span-2">
          <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--color-fg-default)]">变更日志</h3>
            </div>
            <div className="p-5">
              {release.body ? (
                <div
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(release.body) }}
                />
              ) : (
                <p className="text-[var(--color-fg-muted)] text-sm italic">暂无变更日志</p>
              )}
            </div>
          </div>
        </div>

        {/* Downloads */}
        <div className="lg:col-span-1">
          <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden sticky top-4">
            <div className="px-5 py-3 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
              <h3 className="text-sm font-semibold text-[var(--color-fg-default)]">
                Downloads ({release.assets?.length || 0})
              </h3>
            </div>
            <div className="divide-y divide-[var(--color-border-muted)]">
              {!release.assets || release.assets.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-[var(--color-fg-muted)]">
                  暂无下载文件
                </div>
              ) : (
                release.assets.map((asset) => (
                  <div key={asset.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-canvas-subtle)] transition-colors">
                    <span className="text-xl shrink-0">{getFileIcon(asset.name)}</span>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleDownload(asset.id)}
                        className="text-sm text-[var(--color-accent-fg)] hover:underline text-left font-medium block w-full truncate"
                      >
                        {asset.name}
                      </button>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
                        <span>{formatBytes(asset.size)}</span>
                        <span>·</span>
                        <span>{Number(asset.download_count).toLocaleString()} 次下载</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(asset.id)}
                      disabled={downloading === asset.id}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white transition-colors disabled:opacity-60"
                    >
                      {downloading === asset.id ? '下载中' : '下载'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
