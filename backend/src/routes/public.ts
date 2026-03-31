import { Router, Request, Response } from 'express';
import { getDb } from '../db/index';

const router = Router();

// GET /api/releases - Get all published releases with optional filters
router.get('/releases', (req: Request, res: Response) => {
  try {
    const packageFilter = req.query.package as string | undefined;
    const search = req.query.search as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    let query = `
      SELECT r.*,
        (SELECT COUNT(*) FROM assets a JOIN packages p ON a.package_id = p.id WHERE a.name LIKE '%' || REPLACE(r.tag_name, 'v', '') || '%') as asset_count,
        (SELECT SUM(a.download_count) FROM assets a JOIN packages p ON a.package_id = p.id WHERE a.name LIKE '%' || REPLACE(r.tag_name, 'v', '') || '%') as total_downloads,
        (SELECT GROUP_CONCAT(DISTINCT COALESCE(pk.alias, pk.name) ORDER BY pk.name) FROM packages pk WHERE pk.id IN (SELECT DISTINCT a.package_id FROM assets a WHERE a.name LIKE '%' || REPLACE(r.tag_name, 'v', '') || '%')) as all_package_names
      FROM releases r
      WHERE r.is_draft = 0
    `;
    const params: any[] = [];

    // Package filter
    if (packageFilter && packageFilter !== 'all') {
      query += ` AND EXISTS (SELECT 1 FROM packages p WHERE p.name = ? AND EXISTS (SELECT 1 FROM assets a WHERE a.package_id = p.id AND a.name LIKE '%' || REPLACE(r.tag_name, 'v', '') || '%'))`;
      params.push(packageFilter);
    }

    // Date range filter
    if (startDate) {
      query += ` AND DATE(r.created_at) >= DATE(?)`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND DATE(r.created_at) <= DATE(?)`;
      params.push(endDate);
    }

    query += ` ORDER BY r.created_at DESC`;

    const releases = getDb().prepare(query).all(...params);

    // Attach package info and apply search filter
    const filteredReleases = releases.filter((release: any) => {
      // Attach package info
      const packages = getDb().prepare(`
        SELECT p.name as package_name, p.description as package_description, p.alias
        FROM packages p
        WHERE p.releases_id = ?
      `).all(release.id);
      if (packages.length > 0) {
        release.package_name = packages[0].package_name;
        release.package_description = packages[0].package_description;
      }

      // Search filter (fuzzy match on tag_name, title, body, all_package_names)
      if (search) {
        const searchLower = search.toLowerCase();
        const tagMatch = release.tag_name?.toLowerCase().includes(searchLower);
        const titleMatch = release.title?.toLowerCase().includes(searchLower);
        const bodyMatch = release.body?.toLowerCase().includes(searchLower);
        const pkgMatch = release.all_package_names?.toLowerCase().includes(searchLower);
        return tagMatch || titleMatch || bodyMatch || pkgMatch;
      }
      return true;
    });

    res.json(filteredReleases);
  } catch (err) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

// GET /api/releases/:tag - Get single release by tag
router.get('/releases/:tag', (req: Request, res: Response) => {
  try {
    const release = getDb().prepare(`
      SELECT r.*
      FROM releases r
      WHERE r.tag_name = ?
    `).get(req.params.tag) as any;

    if (!release) {
      return res.status(404).json({ error: '版本不存在' });
    }

    // Get package info for this release (by matching assets)
    const normalizedTag = release.tag_name.replace('v', '');
    const packages = getDb().prepare(`
      SELECT DISTINCT p.name as package_name, p.description as package_description, p.homepage, p.alias
      FROM packages p
      WHERE p.id IN (SELECT DISTINCT a.package_id FROM assets a WHERE a.name LIKE '%' || ? || '%')
    `).all(normalizedTag);
    if (packages.length > 0) {
      release.package_name = packages[0].package_name;
      release.package_description = packages[0].package_description;
      release.homepage = packages[0].homepage;
    }

    // Get assets by matching asset name with release tag
    let assets: any[];
    if (release.release_type === 'unified' && release.unified_session_id) {
      // 统一发版：获取同一 session 下所有包的 assets，包含包名
      assets = getDb().prepare(`
        SELECT a.*, p.name as package_name, p.alias as package_alias
        FROM assets a
        JOIN packages p ON a.package_id = p.id
        WHERE a.name LIKE '%' || ? || '%'
        ORDER BY p.id
      `).all(normalizedTag);
    } else {
      assets = getDb().prepare(`
        SELECT a.*, p.name as package_name, p.alias as package_alias
        FROM assets a
        JOIN packages p ON a.package_id = p.id
        WHERE a.name LIKE '%' || ? || '%'
      `).all(normalizedTag);
    }
    res.json({ ...release, assets });
  } catch (err) {
    res.status(500).json({ error: '获取版本详情失败' });
  }
});

// GET /api/packages - Get all packages
router.get('/packages', (_req: Request, res: Response) => {
  try {
    const packages = getDb().prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM releases WHERE id = p.releases_id AND is_draft = 0) as release_count,
        (SELECT MAX(created_at) FROM releases WHERE id = p.releases_id AND is_draft = 0) as latest_release_date,
        (SELECT tag_name FROM releases WHERE id = p.releases_id AND is_draft = 0 ORDER BY created_at DESC LIMIT 1) as latest_tag
      FROM packages p
      ORDER BY p.name ASC
    `).all();
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: '获取包列表失败' });
  }
});

// GET /api/packages/:name/releases - Get releases for a specific package
router.get('/packages/:name/releases', (req: Request, res: Response) => {
  try {
    const pkg = getDb().prepare('SELECT * FROM packages WHERE name = ?').get(req.params.name);
    if (!pkg) {
      return res.status(404).json({ error: '包不存在' });
    }

    const releases = getDb().prepare(`
      SELECT r.*,
        (SELECT COUNT(*) FROM assets a WHERE a.package_id = p.id) as asset_count,
        (SELECT SUM(a.download_count) FROM assets a WHERE a.package_id = p.id) as total_downloads
      FROM releases r
      JOIN packages p ON p.releases_id = r.id
      WHERE p.name = ? AND r.is_draft = 0
      ORDER BY r.created_at DESC
    `).all(req.params.name);
    res.json(releases);
  } catch (err) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

// GET /api/assets/:id/download - Download asset
router.get('/assets/:id/download', (req: Request, res: Response) => {
  try {
    // Get asset with package info for alias replacement
    const asset = getDb().prepare(`
      SELECT a.*, p.name as package_name, p.alias as package_alias
      FROM assets a
      JOIN packages p ON a.package_id = p.id
      WHERE a.id = ?
    `).get(req.params.id) as any;

    if (!asset) {
      return res.status(404).json({ error: '文件不存在' });
    }

    getDb().prepare('UPDATE assets SET download_count = download_count + 1 WHERE id = ?').run(asset.id);

    // Replace package name with alias in filename for download
    const pkgName = asset.package_name || '';
    const pkgAlias = asset.package_alias || pkgName;
    const downloadName = pkgName ? asset.name.replace(pkgName, pkgAlias) : asset.name;

    // Use RFC 5987 encoding for proper filename support (ASCII-only filename*= format)
    const encodedFilename = encodeURIComponent(downloadName);

    if (asset.file_path.startsWith('sample/')) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
      const demoContent = `Demo file: ${downloadName}\nThis is a sample file for demonstration purposes.`;
      res.send(demoContent);
      return;
    }

    // Use fs.createReadStream with manual Content-Disposition
    const fs = require('fs');
    const path = require('path');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    // Use both traditional filename= (for compatibility) and RFC 5987 filename*= (for unicode)
    const asciiFilename = downloadName.replace(/[^\x00-\x7F]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', fs.statSync(asset.file_path).size);
    const fileStream = fs.createReadStream(asset.file_path);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: '下载失败' });
  }
});

// GET /api/stats - Get overall stats
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = {
      totalReleases: (getDb().prepare('SELECT COUNT(*) as count FROM releases WHERE is_draft = 0').get() as any).count,
      totalPackages: (getDb().prepare('SELECT COUNT(*) as count FROM packages').get() as any).count,
      totalDownloads: (getDb().prepare('SELECT COALESCE(SUM(download_count), 0) as total FROM assets').get() as any).total,
      totalAssets: (getDb().prepare('SELECT COUNT(*) as count FROM assets').get() as any).count,
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

export default router;
