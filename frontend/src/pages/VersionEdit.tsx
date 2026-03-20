import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getAdminPackages,
  getAdminReleases,
  createRelease,
  updateRelease,
  uploadAsset,
  deleteAsset,
  getRelease,
} from '../services/api';
import type { Package, Release, Asset } from '../types';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function VersionEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [packages, setPackages] = useState<Package[]>([]);
  const [release, setRelease] = useState<Release | null>(null);
  const [packageId, setPackageId] = useState('');
  const [tagName, setTagName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [isPrerelease, setIsPrerelease] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAdminPackages().then(setPackages);
    if (isEdit) {
      getAdminReleases().then((releases) => {
        const found = releases.find((r: Release) => r.id === Number(id));
        if (found) {
          setRelease(found);
          setPackageId(String(found.package_id));
          setTagName(found.tag_name);
          setTitle(found.title || '');
          setBody(found.body || '');
          setIsDraft(Boolean(found.is_draft));
          setIsPrerelease(Boolean(found.is_prerelease));
          getRelease(found.tag_name).then((detail) => {
            setAssets(detail.assets || []);
          });
        }
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, isEdit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageId || !tagName) {
      setError('请填写必填项');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await updateRelease(Number(id), { title, body, is_draft: isDraft, is_prerelease: isPrerelease });
        setSuccess('版本已更新');
      } else {
        const result = await createRelease({ package_id: packageId, tag_name: tagName, title, body, is_draft: isDraft, is_prerelease: isPrerelease });
        setSuccess('版本已创建');
        setTimeout(() => navigate(`/admin/releases/${result.id}/edit`), 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const asset = await uploadAsset(Number(id), file);
      setAssets((prev) => [...prev, asset]);
      setSuccess('文件上传成功');
    } catch {
      setError('文件上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (!confirm('确定要删除此文件？')) return;
    try {
      await deleteAsset(assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch {
      setError('删除文件失败');
    }
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
      {/* Header */}
      <header className="border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/admin" className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] no-underline flex items-center gap-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            返回
          </Link>
          <span className="text-[var(--color-fg-muted)]">/</span>
          <span className="text-sm text-[var(--color-fg-default)] font-medium">
            {isEdit ? `编辑版本: ${release?.tag_name}` : '新建版本'}
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 text-sm text-[var(--color-danger-fg)] bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-[var(--color-success-fg)] bg-[rgba(63,185,80,0.1)] border border-[rgba(63,185,80,0.3)] rounded-lg px-4 py-3">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Info */}
          <div className="border border-[var(--color-border-default)] rounded-xl p-5" style={{ background: 'var(--color-canvas-subtle)' }}>
            <h3 className="text-sm font-semibold text-[var(--color-fg-default)] mb-4">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isEdit && (
                <div>
                  <label className="block text-sm text-[var(--color-fg-default)] mb-1.5">
                    软件包 <span className="text-[var(--color-danger-fg)]">*</span>
                  </label>
                  <select
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
                    style={{ background: 'var(--color-canvas-default)' }}
                  >
                    <option value="">选择软件包</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!isEdit && (
                <div>
                  <label className="block text-sm text-[var(--color-fg-default)] mb-1.5">
                    版本号 <span className="text-[var(--color-danger-fg)]">*</span>
                  </label>
                  <input
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="如: v1.0.0"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)] font-mono"
                    style={{ background: 'var(--color-canvas-default)' }}
                  />
                </div>
              )}
              <div className={isEdit ? 'md:col-span-2' : ''}>
                <label className="block text-sm text-[var(--color-fg-default)] mb-1.5">标题</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="版本标题（可选）"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)]"
                  style={{ background: 'var(--color-canvas-default)' }}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-[var(--color-fg-default)] mb-1.5">变更日志 (Markdown)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder="## 新增功能&#10;&#10;- 功能 1&#10;- 功能 2&#10;&#10;## 修复&#10;&#10;- 问题修复"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-default)] focus:outline-none focus:border-[var(--color-accent-fg)] font-mono resize-y"
                style={{ background: 'var(--color-canvas-default)' }}
              />
            </div>

            <div className="flex gap-6 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDraft}
                  onChange={(e) => setIsDraft(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-[var(--color-fg-default)]">保存为草稿</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrerelease}
                  onChange={(e) => setIsPrerelease(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-[var(--color-fg-default)]">预发布版本</span>
              </label>
            </div>
          </div>

          {/* Save button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? '保存中...' : isEdit ? '保存修改' : '创建版本'}
            </button>
            <Link
              to="/admin"
              className="px-6 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-all no-underline"
            >
              取消
            </Link>
          </div>
        </form>

        {/* Assets (only in edit mode) */}
        {isEdit && (
          <div className="mt-8 border border-[var(--color-border-default)] rounded-xl p-5" style={{ background: 'var(--color-canvas-subtle)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-fg-default)]">附件文件 ({assets.length})</h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="text-xs px-4 py-2 rounded-lg bg-[var(--color-accent-emphasis)] hover:bg-[var(--color-primary-700)] text-white transition-colors cursor-pointer"
                >
                  {uploading ? '上传中...' : '+ 上传文件'}
                </label>
              </div>
            </div>

            {assets.length === 0 ? (
              <p className="text-sm text-[var(--color-fg-muted)] py-4 text-center">暂无附件，点击上方「上传文件」添加</p>
            ) : (
              <div className="divide-y divide-[var(--color-border-muted)]">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 py-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-fg-muted)" strokeWidth="2" className="shrink-0">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--color-fg-default)] truncate">{asset.name}</div>
                      <div className="text-xs text-[var(--color-fg-muted)]">{formatBytes(asset.size)} · {Number(asset.download_count).toLocaleString()} 次下载</div>
                    </div>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="text-xs px-3 py-1 rounded-md border border-[var(--color-border-default)] text-[var(--color-danger-fg)] hover:border-[var(--color-danger-fg)] transition-all shrink-0"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
