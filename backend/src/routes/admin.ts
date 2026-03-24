import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index';
import { authenticateToken, requireAdmin, AuthRequest, JWT_SECRET } from '../middleware/auth';

const router = Router();

// Fix filename encoding (Latin-1 misinterpreted as UTF-8 -> correct UTF-8)
function fixFilename(filename: string): string {
  return Buffer.from(filename, 'latin1').toString('utf8');
}

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// POST /api/admin/login
router.post('/login', (req: AuthRequest, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, role: user.role });
});

// POST /api/admin/logout
router.post('/logout', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  res.json({ message: '登出成功' });
});

// GET /api/admin/releases - Get all releases (including drafts)
router.get('/releases', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  try {
    const releases = getDb().prepare(`
      SELECT r.*, p.name as package_name,
        (SELECT COUNT(*) FROM assets WHERE release_id = r.id) as asset_count
      FROM releases r
      JOIN packages p ON r.package_id = p.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(releases);
  } catch (err) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

// POST /api/admin/releases - Create release
router.post('/releases', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { package_id, tag_name, title, body, is_draft, is_prerelease } = req.body;
    if (!package_id || !tag_name) {
      return res.status(400).json({ error: '包 ID 和版本号不能为空' });
    }

    try {
      const result = getDb().prepare(`
        INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(package_id, tag_name, title || '', body || '', is_draft ? 1 : 0, is_prerelease ? 1 : 0);

      const releaseId = Number(result.lastInsertRowid);
      const release = getDb().prepare('SELECT * FROM releases WHERE id = ?').get(releaseId);
      res.status(201).json(release);
    } catch (err: any) {
      if (err.message?.includes('UNIQUE') || err.message?.includes('unique')) {
        return res.status(409).json({ error: '该版本号已存在' });
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: '创建版本失败' });
  }
});

// PUT /api/admin/releases/:id - Update release
router.put('/releases/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { title, body, is_draft, is_prerelease } = req.body;
    getDb().prepare(`
      UPDATE releases
      SET title = ?, body = ?, is_draft = ?, is_prerelease = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, body, is_draft ? 1 : 0, is_prerelease ? 1 : 0, req.params.id);

    const release = getDb().prepare('SELECT * FROM releases WHERE id = ?').get(req.params.id);
    if (!release) return res.status(404).json({ error: '版本不存在' });
    res.json(release);
  } catch (err) {
    res.status(500).json({ error: '更新版本失败' });
  }
});

// DELETE /api/admin/releases/:id - Delete release
router.delete('/releases/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const assets = getDb().prepare('SELECT file_path FROM assets WHERE release_id = ?').all(req.params.id) as any[];
    const fs = require('fs');

    for (const asset of assets) {
      if (!asset.file_path.startsWith('sample/') && fs.existsSync(asset.file_path)) {
        fs.unlinkSync(asset.file_path);
      }
    }

    getDb().prepare('DELETE FROM releases WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除版本失败' });
  }
});

// POST /api/admin/releases/:id/assets - Upload asset
router.post('/releases/:id/assets', authenticateToken, requireAdmin, upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    const release = getDb().prepare('SELECT id FROM releases WHERE id = ?').get(req.params.id);
    if (!release) {
      return res.status(404).json({ error: '版本不存在' });
    }

    const originalName = fixFilename(req.file!.originalname);
    getDb().prepare(`
      INSERT INTO assets (release_id, name, size, file_path)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, originalName, req.file!.size, req.file!.path);

    const inserted = getDb().prepare('SELECT * FROM assets WHERE release_id = ? AND name = ? AND size = ?').get(req.params.id, originalName, req.file!.size) as any;
    if (!inserted) return res.status(500).json({ error: '上传文件失败' });
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: '上传文件失败' });
  }
});

// DELETE /api/admin/assets/:id - Delete asset
router.delete('/assets/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const assetId = Number(req.params.id);
    if (isNaN(assetId)) return res.status(400).json({ error: '无效的文件ID' });

    const asset = getDb().prepare('SELECT * FROM assets WHERE id = ?').get(assetId) as any;
    if (!asset) return res.status(404).json({ error: '文件不存在' });

    if (!asset.file_path.startsWith('sample/')) {
      const fs = require('fs');
      if (fs.existsSync(asset.file_path)) {
        fs.unlinkSync(asset.file_path);
      }
    }

    getDb().prepare('DELETE FROM assets WHERE id = ?').run(assetId);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除文件失败' });
  }
});

// GET /api/admin/packages - Get all packages
router.get('/packages', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  try {
    const packages = getDb().prepare('SELECT * FROM packages ORDER BY name ASC').all();
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: '获取包列表失败' });
  }
});

// POST /api/admin/packages - Create package
router.post('/packages', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { name, description, homepage } = req.body;
    if (!name) return res.status(400).json({ error: '包名不能为空' });

    try {
      getDb().prepare('INSERT INTO packages (name, description, homepage) VALUES (?, ?, ?)').run(name, description || '', homepage || '');
      // Query by name instead of using lastInsertRowid (sql.js bug)
      const pkg = getDb().prepare('SELECT * FROM packages WHERE name = ?').get(name);
      res.status(201).json(pkg);
    } catch (err: any) {
      if (err.message?.includes('UNIQUE') || err.message?.includes('unique')) {
        return res.status(409).json({ error: '包名已存在' });
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: '创建包失败' });
  }
});

// DELETE /api/admin/packages/:id - Delete package
router.delete('/packages/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    getDb().prepare('DELETE FROM packages WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除包失败' });
  }
});

// GET /api/admin/stats - Admin stats
router.get('/stats', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  try {
    const stats = {
      totalReleases: (getDb().prepare('SELECT COUNT(*) as count FROM releases').get() as any).count,
      draftReleases: (getDb().prepare('SELECT COUNT(*) as count FROM releases WHERE is_draft = 1').get() as any).count,
      totalPackages: (getDb().prepare('SELECT COUNT(*) as count FROM packages').get() as any).count,
      totalDownloads: (getDb().prepare('SELECT COALESCE(SUM(download_count), 0) as total FROM assets').get() as any).total,
      totalAssets: (getDb().prepare('SELECT COUNT(*) as count FROM assets').get() as any).count,
      recentReleases: getDb().prepare('SELECT r.*, p.name as package_name FROM releases r JOIN packages p ON r.package_id = p.id ORDER BY r.created_at DESC LIMIT 5').all(),
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// GET /api/admin/users - Get all users
router.get('/users', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const users = getDb().prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// POST /api/admin/users - Create user
router.post('/users', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // Check if user already exists
    const existing = getDb().prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = getDb().prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, passwordHash, role || 'user');

    // Get the last inserted user using the returned lastInsertRowid
    const userId = Number(result.lastInsertRowid);
    const user = getDb().prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(userId);
    res.status(201).json(user);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: '创建用户失败' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const user = getDb().prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id) as any;
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // Prevent deleting yourself
    if (req.userId === parseInt(req.params.id)) {
      return res.status(400).json({ error: '不能删除当前登录账号' });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = (getDb().prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any).count;
      if (adminCount <= 1) {
        return res.status(400).json({ error: '不能删除最后一个管理员账号' });
      }
    }

    getDb().prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除用户失败' });
  }
});

export default router;
