import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const uploadsDir = path.join(__dirname, '../../../uploads');

// In-memory build sessions for tracking multi-package releases
interface PackageBuildStatus {
  package_id: number;
  package_name: string;
  job_name: string;
  build_number: number | null;
  status: 'pending' | 'triggering' | 'building' | 'downloading' | 'completed' | 'failed';
  result: string | null;
  artifact_name: string | null;
  artifact_size: number | null;
  error: string | null;
  progress: number; // 0-100
}

interface BuildSession {
  id: string;
  tag_name: string;
  created_at: string;
  packages: PackageBuildStatus[];
  overall_status: 'running' | 'completed' | 'failed';
  release_id: number | null;
}

const buildSessions = new Map<string, BuildSession>();

// Helper: increment version number
function incrementVersion(latestTag: string | null): string {
  if (!latestTag) return 'v1.0.0';
  const match = latestTag.match(/^v?(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) return 'v1.0.0';
  const [, major, minor, patch, suffix] = match;
  return `v${major}.${minor}.${parseInt(patch) + 1}${suffix}`;
}

// Helper: HTTP request with Basic Auth
function jenkinsRequest(url: string, options: any, credentials: string): Promise<{ res: any; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        ...options.headers,
      },
      rejectUnauthorized: false, // 忽略证书错误
    };

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ res, body }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Helper: download file
function downloadFile(url: string, destPath: string, credentials: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'Authorization': `Basic ${credentials}` },
      rejectUnauthorized: false,
    };

    const req = lib.request(reqOptions, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location!;
        downloadFile(redirectUrl, destPath, credentials).then(resolve).catch(reject);
        return;
      }
      const writeStream = fs.createWriteStream(destPath);
      res.pipe(writeStream);
      writeStream.on('finish', () => {
        writeStream.close();
        resolve(fs.statSync(destPath).size);
      });
      writeStream.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

// GET /api/admin/jenkins-config/:packageId - Get config for a package
router.get('/jenkins-config/:packageId', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const config = getDb().prepare('SELECT * FROM jenkins_configs WHERE package_id = ?').get(req.params.packageId);
    if (config) {
      // Don't expose api_token
      (config as any).api_token = undefined;
    }
    res.json(config || null);
  } catch (err) {
    res.status(500).json({ error: '获取配置失败' });
  }
});

// GET /api/admin/jenkins-configs - Get all configs
router.get('/jenkins-configs', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  try {
    const configs = getDb().prepare(`
      SELECT jc.*, p.name as package_name
      FROM jenkins_configs jc
      JOIN packages p ON jc.package_id = p.id
    `).all();
    res.json(configs.map((c: any) => { c.api_token = undefined; return c; }));
  } catch (err) {
    res.status(500).json({ error: '获取配置失败' });
  }
});

// POST /api/admin/jenkins-config - Create or update config
router.post('/jenkins-config', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { package_id, jenkins_url, job_name, username, api_token, artifact_pattern } = req.body;
    if (!package_id || !jenkins_url || !job_name || !username || !api_token) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const existing = getDb().prepare('SELECT id FROM jenkins_configs WHERE package_id = ?').get(package_id);
    if (existing) {
      getDb().prepare(`
        UPDATE jenkins_configs
        SET jenkins_url=?, job_name=?, username=?, api_token=?, artifact_pattern=?
        WHERE package_id=?
      `).run(jenkins_url, job_name, username, api_token, artifact_pattern || '*.zip', package_id);
      const updated = getDb().prepare('SELECT * FROM jenkins_configs WHERE package_id = ?').get(package_id) as any;
      updated.api_token = undefined;
      res.json(updated);
    } else {
      const result = getDb().prepare(`
        INSERT INTO jenkins_configs (package_id, jenkins_url, job_name, username, api_token, artifact_pattern)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(package_id, jenkins_url, job_name, username, api_token, artifact_pattern || '*.zip');
      const pkgId = Number(result.lastInsertRowid);
      const inserted = getDb().prepare('SELECT * FROM jenkins_configs WHERE id = ?').get(pkgId) as any;
      inserted.api_token = undefined;
      res.status(201).json(inserted);
    }
  } catch (err) {
    res.status(500).json({ error: '保存配置失败' });
  }
});

// DELETE /api/admin/jenkins-config/:packageId
router.delete('/jenkins-config/:packageId', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    getDb().prepare('DELETE FROM jenkins_configs WHERE package_id = ?').run(req.params.packageId);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除配置失败' });
  }
});

// GET /api/admin/jenkins-build/status/:jobName/:buildNumber - Get build status
router.get('/jenkins-build/status/:jobName/:buildNumber', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { jobName, buildNumber } = req.params;
    const config: any = getDb().prepare(`
      SELECT jc.* FROM jenkins_configs jc
      JOIN packages p ON jc.package_id = p.id
      LIMIT 1
    `).get();
    if (!config) return res.status(404).json({ error: '未配置 Jenkins' });

    const credentials = Buffer.from(`${config.username}:${config.api_token}`).toString('base64');
    const baseUrl = config.jenkins_url.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json`;

    const { body } = await jenkinsRequest(apiUrl, {}, credentials);
    const data = JSON.parse(body || '{}');

    res.json({
      building: data.building ?? false,
      result: data.result ?? null,
      duration: data.duration ?? 0,
      number: data.number,
      url: data.url,
    });
  } catch (err: any) {
    res.status(500).json({ error: '获取构建状态失败: ' + err.message });
  }
});

// POST /api/admin/jenkins-build/trigger-all - Trigger all packages at once
router.post('/jenkins-build/trigger-all', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const configs = getDb().prepare(`
      SELECT jc.*, p.name as package_name
      FROM jenkins_configs jc
      JOIN packages p ON jc.package_id = p.id
    `).all() as any[];

    if (configs.length === 0) {
      return res.status(404).json({ error: '没有任何软件包配置了 Jenkins，请先在软件包中配置' });
    }

    // Calculate next version number
    const allReleases = getDb().prepare('SELECT tag_name FROM releases ORDER BY created_at DESC LIMIT 1').get() as any;
    const tagName = incrementVersion(allReleases?.tag_name);

    // Create session
    const sessionId = uuidv4();
    const session: BuildSession = {
      id: sessionId,
      tag_name: tagName,
      created_at: new Date().toISOString(),
      packages: configs.map((c) => ({
        package_id: c.package_id,
        package_name: c.package_name,
        job_name: c.job_name,
        build_number: null,
        status: 'pending',
        result: null,
        artifact_name: null,
        artifact_size: null,
        error: null,
        progress: 0,
      })),
      overall_status: 'running',
      release_id: null,
    };
    buildSessions.set(sessionId, session);

    // Fire off builds for all packages in parallel (async, don't await)
    triggerPackageBuilds(sessionId, configs, tagName);

    res.status(202).json({ session_id: sessionId, tag_name: tagName, package_count: configs.length });
  } catch (err: any) {
    res.status(500).json({ error: '启动发版失败: ' + err.message });
  }
});

// Background: trigger builds for all packages
async function triggerPackageBuilds(sessionId: string, configs: any[], tagName: string) {
  const session = buildSessions.get(sessionId);
  if (!session) return;

  await Promise.allSettled(
    configs.map((config, idx) => buildSinglePackage(sessionId, idx, config, tagName))
  );

  const anyFailed = session.packages.some((p) => p.status === 'failed');
  const allDone = session.packages.every((p) => p.status === 'completed');
  session.overall_status = anyFailed ? 'failed' : 'completed';
}

// Build a single package (runs in background)
async function buildSinglePackage(sessionId: string, idx: number, config: any, tagName: string) {
  const session = buildSessions.get(sessionId);
  if (!session) return;
  const pkg = session.packages[idx];

  pkg.status = 'triggering';
  pkg.progress = 10;

  const credentials = Buffer.from(`${config.username}:${config.api_token}`).toString('base64');
  const baseUrl = config.jenkins_url.replace(/\/$/, '');
  const jobName = encodeURIComponent(config.job_name);

  // Step 1: Trigger
  let buildNumber: number | null = null;
  try {
    const { res: triggerRes } = await jenkinsRequest(
      `${baseUrl}/job/${jobName}/build`,
      { method: 'POST' },
      credentials
    );
    const location = triggerRes.headers.location as string | undefined;
    if (location) {
      let attempts = 0;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const { body: queueBody } = await jenkinsRequest(`${baseUrl}${location}/api/json`, {}, credentials);
          const queueData = JSON.parse(queueBody);
          if (!queueData.inQueue) {
            buildNumber = queueData.executable?.number ?? null;
            break;
          }
        } catch { /* ignore */ }
        attempts++;
      }
    }
  } catch (err: any) {
    pkg.status = 'failed';
    pkg.error = '触发失败: ' + err.message;
    pkg.progress = 100;
    return;
  }

  pkg.build_number = buildNumber;
  pkg.status = 'building';
  pkg.progress = 30;

  // Step 2: Poll build status
  let buildResult: string | null = null;
  let artifacts: any[] = [];
  if (buildNumber) {
    let attempts = 0;
    while (attempts < 120) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const { body } = await jenkinsRequest(`${baseUrl}/job/${jobName}/${buildNumber}/api/json`, {}, credentials);
        const data = JSON.parse(body || '{}');
        if (!data.building) {
          buildResult = data.result;
          artifacts = data.artifacts || [];
          pkg.progress = 60;
          break;
        }
        pkg.progress = 30 + Math.min(29, attempts * 0.5);
      } catch { /* ignore */ }
      attempts++;
    }
  } else {
    pkg.status = 'failed';
    pkg.error = '无法获取 build number';
    pkg.progress = 100;
    return;
  }

  if (!buildResult) {
    pkg.status = 'failed';
    pkg.error = '构建超时';
    pkg.progress = 100;
    return;
  }

  if (buildResult !== 'SUCCESS') {
    pkg.status = 'failed';
    pkg.error = `构建失败: ${buildResult}`;
    pkg.result = buildResult;
    pkg.progress = 100;
    return;
  }

  pkg.result = 'SUCCESS';
  pkg.status = 'downloading';
  pkg.progress = 70;

  // Step 3: Download artifact
  const pattern = config.artifact_pattern || '*.zip';
  const matched = artifacts.find((a: any) => matchGlob(a.relativePath, pattern));

  if (!matched) {
    pkg.status = 'completed';
    pkg.artifact_name = null;
    pkg.error = `未找到匹配 "${pattern}" 的产物`;
    pkg.progress = 100;
    return;
  }

  const artifactPath = matched.relativePath;
  const artifactUrl = `${baseUrl}/job/${jobName}/${buildNumber}/artifact/${artifactPath}`;
  const fileName = path.basename(artifactPath);
  const localPath = path.join(uploadsDir, `${uuidv4()}_${fileName}`);

  try {
    await downloadFile(artifactUrl, localPath, credentials);
    const fileSize = fs.statSync(localPath).size;

    // Create release and asset
    const releaseResult = getDb().prepare(
      'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(config.package_id, tagName, `Build #${buildNumber}`, '', 0, 0);
    Number(releaseResult.lastInsertRowid);

    getDb().prepare(
      'INSERT INTO assets (release_id, name, size, file_path) VALUES (?, ?, ?, ?)'
    ).run(releaseResult.lastInsertRowid, fileName, fileSize, localPath);

    pkg.artifact_name = fileName;
    pkg.artifact_size = fileSize;
    pkg.status = 'completed';
    pkg.progress = 100;
  } catch (err: any) {
    pkg.status = 'failed';
    pkg.error = '下载产物失败: ' + err.message;
    pkg.progress = 100;
  }
}

// GET /api/admin/jenkins-build/session/:sessionId
router.get('/jenkins-build/session/:sessionId', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const session = buildSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: '构建会话不存在或已过期' });
  res.json(session);
});

// GET /api/admin/jenkins-build/history
router.get('/jenkins-build/history', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const sessions = Array.from(buildSessions.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);
  res.json(sessions);
});
router.post('/jenkins-build/trigger', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { package_id } = req.body;
    if (!package_id) return res.status(400).json({ error: '缺少 package_id' });

    const config: any = getDb().prepare('SELECT * FROM jenkins_configs WHERE package_id = ?').get(package_id);
    if (!config) return res.status(404).json({ error: '该包未配置 Jenkins，请先配置' });

    const credentials = Buffer.from(`${config.username}:${config.api_token}`).toString('base64');
    const baseUrl = config.jenkins_url.replace(/\/$/, '');
    const jobName = encodeURIComponent(config.job_name);

    // Step 1: Trigger build
    let buildNumber: number | null = null;
    try {
      const { res: triggerRes } = await jenkinsRequest(
        `${baseUrl}/job/${jobName}/build`,
        { method: 'POST' },
        credentials
      );

      const location = triggerRes.headers.location as string | undefined;
      if (location) {
        // Poll queue to get actual build number
        const queueUrl = location.replace(baseUrl, baseUrl);
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(r => setTimeout(r, 2000));
          const { body: queueBody } = await jenkinsRequest(`${baseUrl}${queueUrl}/api/json`, {}, credentials);
          const queueData = JSON.parse(queueBody);
          if (!queueData.inQueue) {
            buildNumber = queueData.executable?.number ?? null;
            break;
          }
          attempts++;
        }
      }
    } catch (err: any) {
      return res.status(502).json({ error: '触发 Jenkins 构建失败: ' + err.message });
    }

    if (!buildNumber) {
      // If we couldn't get build number, at least create a release with timestamp
      const now = new Date();
      const timestamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
      const latestRelease = getDb().prepare(
        'SELECT tag_name FROM releases WHERE package_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(package_id) as any;
      const tagName = incrementVersion(latestRelease?.tag_name);

      const result = getDb().prepare(
        'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(package_id, tagName, `Build #${buildNumber || 'unknown'}`, '', 0, 0);
      const releaseId = Number(result.lastInsertRowid);

      return res.status(201).json({
        triggered: true,
        buildNumber: null,
        releaseId,
        tagName,
        status: 'queued',
        message: '构建已触发，但无法获取 build number',
      });
    }

    // Step 2: Poll build status until complete
    let buildResult: string | null = null;
    let artifacts: any[] = [];
    let attempts = 0;
    const maxAttempts = 120; // 2 min max

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1500));
      const { body } = await jenkinsRequest(
        `${baseUrl}/job/${jobName}/${buildNumber}/api/json`,
        {},
        credentials
      );
      const data = JSON.parse(body || '{}');
      if (!data.building) {
        buildResult = data.result;
        artifacts = data.artifacts || [];
        break;
      }
      attempts++;
    }

    if (!buildResult) {
      return res.status(202).json({
        triggered: true,
        buildNumber,
        status: 'building',
        message: '构建仍在进行中',
      });
    }

    if (buildResult !== 'SUCCESS') {
      return res.status(200).json({
        triggered: true,
        buildNumber,
        status: 'failed',
        result: buildResult,
        message: `构建失败: ${buildResult}`,
      });
    }

    // Step 3: Find matching artifact
    const pattern = config.artifact_pattern || '*.zip';
    const matched = artifacts.find((a: any) => matchGlob(a.relativePath, pattern));

    if (!matched) {
      // Create release without asset
      const latestRelease = getDb().prepare(
        'SELECT tag_name FROM releases WHERE package_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(package_id) as any;
      const tagName = incrementVersion(latestRelease?.tag_name);
      const result = getDb().prepare(
        'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(package_id, tagName, `Build #${buildNumber}`, '', 0, 0);
      const releaseId = Number(result.lastInsertRowid);

      return res.status(201).json({
        triggered: true,
        buildNumber,
        result: 'SUCCESS',
        status: 'partial',
        message: `构建成功，但未找到匹配 "${pattern}" 的产物`,
        releaseId,
        tagName,
      });
    }

    // Step 4: Download artifact
    const artifactPath = matched.relativePath;
    const artifactUrl = `${baseUrl}/job/${jobName}/${buildNumber}/artifact/${artifactPath}`;
    const fileName = path.basename(artifactPath);
    const localPath = path.join(uploadsDir, `${uuidv4()}_${fileName}`);

    try {
      await downloadFile(artifactUrl, localPath, credentials);
    } catch (err: any) {
      return res.status(502).json({ error: `下载产物失败: ${err.message}` });
    }

    const fileSize = fs.statSync(localPath).size;

    // Step 5: Get or create release
    const latestRelease = getDb().prepare(
      'SELECT tag_name FROM releases WHERE package_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(package_id) as any;
    const tagName = incrementVersion(latestRelease?.tag_name);

    const releaseResult = getDb().prepare(
      'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(package_id, tagName, `Build #${buildNumber}`, '', 0, 0);
    const releaseId = Number(releaseResult.lastInsertRowid);

    // Step 6: Create asset
    getDb().prepare(
      'INSERT INTO assets (release_id, name, size, file_path) VALUES (?, ?, ?, ?)'
    ).run(releaseId, fileName, fileSize, localPath);

    res.status(201).json({
      triggered: true,
      buildNumber,
      result: 'SUCCESS',
      status: 'completed',
      releaseId,
      tagName,
      artifactName: fileName,
      artifactSize: fileSize,
    });
  } catch (err: any) {
    console.error('Jenkins trigger error:', err);
    res.status(500).json({ error: '发版失败: ' + err.message });
  }
});

// Simple glob matching (e.g. *.zip, app-*.zip)
function matchGlob(filePath: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexPattern}$`).test(filePath) ||
         new RegExp(`^${regexPattern}$`).test(path.basename(filePath));
}

export default router;
