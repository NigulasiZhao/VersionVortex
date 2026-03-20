import { Router, Request, Response } from 'express';
import { getDb } from '../db/index';

const router = Router();

// GET /api/releases - Get all published releases
router.get('/releases', (_req: Request, res: Response) => {
  try {
    const releases = getDb().prepare(`
      SELECT r.*, p.name as package_name, p.description as package_description,
        (SELECT COUNT(*) FROM assets WHERE release_id = r.id) as asset_count,
        (SELECT SUM(download_count) FROM assets WHERE release_id = r.id) as total_downloads
      FROM releases r
      JOIN packages p ON r.package_id = p.id
      WHERE r.is_draft = 0
      ORDER BY r.created_at DESC
    `).all();
    res.json(releases);
  } catch (err) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

// GET /api/releases/:tag - Get single release by tag
router.get('/releases/:tag', (req: Request, res: Response) => {
  try {
    const release = getDb().prepare(`
      SELECT r.*, p.name as package_name, p.description as package_description, p.homepage
      FROM releases r
      JOIN packages p ON r.package_id = p.id
      WHERE r.tag_name = ?
    `).get(req.params.tag);

    if (!release) {
      return res.status(404).json({ error: '版本不存在' });
    }

    const assets = getDb().prepare('SELECT * FROM assets WHERE release_id = ?').all((release as any).id);
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
        (SELECT COUNT(*) FROM releases WHERE package_id = p.id AND is_draft = 0) as release_count,
        (SELECT MAX(created_at) FROM releases WHERE package_id = p.id AND is_draft = 0) as latest_release_date,
        (SELECT tag_name FROM releases WHERE package_id = p.id AND is_draft = 0 ORDER BY created_at DESC LIMIT 1) as latest_tag
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
        (SELECT COUNT(*) FROM assets WHERE release_id = r.id) as asset_count,
        (SELECT SUM(download_count) FROM assets WHERE release_id = r.id) as total_downloads
      FROM releases r
      WHERE r.package_id = ? AND r.is_draft = 0
      ORDER BY r.created_at DESC
    `).all((pkg as any).id);
    res.json(releases);
  } catch (err) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

// GET /api/assets/:id/download - Download asset
router.get('/assets/:id/download', (req: Request, res: Response) => {
  try {
    const asset = getDb().prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id) as any;
    if (!asset) {
      return res.status(404).json({ error: '文件不存在' });
    }

    getDb().prepare('UPDATE assets SET download_count = download_count + 1 WHERE id = ?').run(asset.id);

    if (asset.file_path.startsWith('sample/')) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${asset.name}"`);
      res.send(`Demo file: ${asset.name}\nThis is a sample file for demonstration purposes.`);
      return;
    }

    res.download(asset.file_path, asset.name);
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
