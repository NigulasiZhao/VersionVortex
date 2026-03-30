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
  artifact_name: string | null;  // 单个产物名（兼容旧显示）
  artifact_names: string[];        // 所有产物名
  artifact_sizes: number[];        // 所有产物大小
  artifact_size: number | null;    // 单个产物大小（兼容旧显示）
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

// Database helpers for build sessions
function saveBuildSessionToDb(session: BuildSession) {
  const db = getDb();
  // Upsert session
  db.prepare(`
    INSERT OR REPLACE INTO build_sessions (id, tag_name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(session.id, session.tag_name, session.overall_status, session.created_at, new Date().toISOString());

  // Delete old package records and insert new ones
  db.prepare('DELETE FROM build_packages WHERE session_id = ?').run(session.id);

  for (const pkg of session.packages) {
    db.prepare(`
      INSERT INTO build_packages (session_id, package_id, package_name, status, progress, build_number, error, artifact_names, artifact_sizes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      pkg.package_id,
      pkg.package_name,
      pkg.status,
      pkg.progress,
      pkg.build_number,
      pkg.error,
      JSON.stringify(pkg.artifact_names),
      JSON.stringify(pkg.artifact_sizes)
    );
  }
}

function getBuildSessionFromDb(sessionId: string): BuildSession | null {
  const db = getDb();
  const session = db.prepare('SELECT * FROM build_sessions WHERE id = ?').get(sessionId) as any;
  if (!session) return null;

  const packages = db.prepare(`
    SELECT bp.*, COALESCE(p.alias, p.name) as display_name
    FROM build_packages bp
    JOIN packages p ON bp.package_id = p.id
    WHERE bp.session_id = ?
  `).all(sessionId) as any[];

  return {
    id: session.id,
    tag_name: session.tag_name,
    created_at: session.created_at,
    overall_status: session.status,
    release_id: null,
    packages: packages.map(p => ({
      package_id: p.package_id,
      package_name: p.display_name,
      job_name: '',
      build_number: p.build_number,
      status: p.status as any,
      result: null,
      artifact_name: p.artifact_names ? JSON.parse(p.artifact_names)[0] : null,
      artifact_names: p.artifact_names ? JSON.parse(p.artifact_names) : [],
      artifact_sizes: p.artifact_sizes ? JSON.parse(p.artifact_sizes) : [],
      artifact_size: p.artifact_sizes ? JSON.parse(p.artifact_sizes)[0] : null,
      error: p.error,
      progress: p.progress,
    })),
  };
}

function getActiveBuildSessionFromDb(): BuildSession | null {
  const db = getDb();
  const session = db.prepare("SELECT * FROM build_sessions WHERE status = 'running' ORDER BY created_at DESC LIMIT 1").get() as any;
  if (!session) return null;
  return getBuildSessionFromDb(session.id);
}

// Helper: increment version number
// mode: 'minor' -> unified release (minor++, patch=0), 'patch' -> single release (patch++)
function incrementVersion(latestTag: string | null, mode: 'minor' | 'patch' = 'patch'): string {
  if (!latestTag) return '1.0.0';
  const match = latestTag.match(/^v?(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) return '1.0.0';
  const [, major, minor, patch, suffix] = match;
  if (mode === 'minor') {
    return `${major}.${parseInt(minor) + 1}.0${suffix}`;
  }
  return `${major}.${minor}.${parseInt(patch) + 1}${suffix}`;
}

// Helper: calculate unified version (highest minor among selected packages + 1, patch=0)
function calculateUnifiedVersion(_packageIds: number[]): string {
  // Get highest version directly from releases table
  const latest = getDb().prepare(
    'SELECT tag_name FROM releases ORDER BY created_at DESC LIMIT 1'
  ).get() as any;
  let highestVersion = latest?.tag_name?.replace(/^v/, '') || '0.0.0';
  const match = highestVersion.match(/^v?(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) return '1.0.0';
  const [, major, minor] = match;
  return `${major}.${parseInt(minor) + 1}.0`;
}

// Compare versions: returns 1 if a > b, -1 if a < b, 0 if equal
function compareVersions(a: string, b: string): number {
  const aParts = a.match(/\d+/g)?.map(Number) || [0, 0, 0];
  const bParts = b.match(/\d+/g)?.map(Number) || [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (aParts[i] > bParts[i]) return 1;
    if (aParts[i] < bParts[i]) return -1;
  }
  return 0;
}

// Helper: HTTP request with Basic Auth (30s timeout guarantee)
function jenkinsRequest(url: string, options: any, credentials: string): Promise<{ res: any; body: string }> {
  const timeoutMs = 30000;
  const reqPromise = new Promise<{ res: any; body: string }>((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        ...options.headers,
      },
    };

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ res, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timeout after ${timeoutMs}ms`)); });
    if (options.body) req.write(options.body);
    req.end();
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms for ${url}`)), timeoutMs)
  );

  return Promise.race([reqPromise, timeoutPromise]);
}

// Helper: download file (with timeout and crumb auth)
async function downloadFile(url: string, destPath: string, credentials: string): Promise<number> {
  const timeoutMs = 60000;
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.port ? ':' + urlObj.port : ''}`;

  // Fetch crumb first for CSRF protection
  let crumbHeader = '';
  try {
    const { body: crumbBody } = await jenkinsRequest(`${baseUrl}/crumbIssuer/api/json`, {}, credentials);
    const crumbData = JSON.parse(crumbBody);
    crumbHeader = `${crumbData.crumbRequestField || 'Jenkins-Crumb'}:${crumbData.crumb}`;
  } catch { /* ignore crumb failure */ }

  const downloadPromise = new Promise<number>((resolve, reject) => {
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers: Record<string, string> = { 'Authorization': `Basic ${credentials}` };
    if (crumbHeader) {
      const [k, v] = crumbHeader.split(':');
      headers[k] = v;
    }

    const reqOptions: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers,
    };

    const req = lib.request(reqOptions, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location!;
        downloadFile(redirectUrl, destPath, credentials).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
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
    req.on('error', (err) => { reject(err); });
    req.end();
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Download timeout after ${timeoutMs}ms: ${url}`)), timeoutMs)
  );

  return Promise.race([downloadPromise, timeoutPromise]);
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
      getDb().prepare(`
        INSERT INTO jenkins_configs (package_id, jenkins_url, job_name, username, api_token, artifact_pattern)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(package_id, jenkins_url, job_name, username, api_token, artifact_pattern || '*.zip');
      const inserted = getDb().prepare('SELECT * FROM jenkins_configs WHERE package_id = ?').get(package_id) as any;
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

// POST /api/admin/jenkins-build/unified-release - Unified release for selected packages
router.post('/jenkins-build/unified-release', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Accept optional package_ids array; if not provided, trigger all configured packages
    const { package_ids } = req.body as { package_ids?: number[] };

    let configs = getDb().prepare(`
      SELECT jc.*, p.name as package_name, COALESCE(p.alias, p.name) as display_name
      FROM jenkins_configs jc
      JOIN packages p ON jc.package_id = p.id
    `).all() as any[];

    if (package_ids && package_ids.length > 0) {
      configs = configs.filter(c => package_ids.includes(c.package_id));
    }

    if (configs.length === 0) {
      return res.status(404).json({ error: '没有任何软件包配置了 Jenkins，请先在软件包中配置' });
    }

    // Calculate unified version: highest minor + 1, patch = 0
    const pkgIds = configs.map(c => c.package_id);
    const tagName = calculateUnifiedVersion(pkgIds);

    // Create session
    const sessionId = uuidv4();
    const session: BuildSession = {
      id: sessionId,
      tag_name: tagName,
      created_at: new Date().toISOString(),
      packages: configs.map((c) => ({
        package_id: c.package_id,
        package_name: c.display_name,
        job_name: c.job_name,
        build_number: null,
        status: 'pending',
        result: null,
        artifact_name: null,
        artifact_names: [],
        artifact_sizes: [],
        artifact_size: null,
        error: null,
        progress: 0,
      })),
      overall_status: 'running',
      release_id: null,
    };
    buildSessions.set(sessionId, session);

    // Save to database for persistence
    saveBuildSessionToDb(session);

    // Fire off builds for all packages in parallel (async, don't await)
    triggerPackageBuilds(sessionId, configs, tagName, 'unified');

    res.status(202).json({ session_id: sessionId, tag_name: tagName, package_count: configs.length });
  } catch (err: any) {
    res.status(500).json({ error: '启动发版失败: ' + err.message });
  }
});

// Background: trigger builds for all packages
async function triggerPackageBuilds(sessionId: string, configs: any[], tagName: string, releaseType: 'unified' | 'single' = 'single') {
  const session = buildSessions.get(sessionId);
  if (!session) return;

  await Promise.allSettled(
    configs.map((config, idx) => buildSinglePackage(sessionId, idx, config, tagName, releaseType))
  );

  const anyFailed = session.packages.some((p) => p.status === 'failed');
  const allDone = session.packages.every((p) => p.status === 'completed');
  session.overall_status = anyFailed ? 'failed' : 'completed';

  // If unified release and any package failed, rollback (mark all releases as failed)
  if (releaseType === 'unified' && anyFailed) {
    const db = getDb();
    const failedPkgIds = session.packages.filter(p => p.status === 'failed').map(p => p.package_id);
    // Mark releases from this session as draft (soft rollback)
    // Now using packages.releases_id -> releases (new schema)
    db.prepare(`
      UPDATE releases SET is_draft = 1, body = '统一发版失败，已回滚'
      WHERE unified_session_id = ?
      AND id IN (
        SELECT p.releases_id FROM packages p
        WHERE p.id IN (${failedPkgIds.map(() => '?').join(',')})
      )
    `).run(sessionId, ...failedPkgIds);
  }

  // Save final status to database
  saveBuildSessionToDb(session);
}

// Build a single package (runs in background)
async function buildSinglePackage(sessionId: string, idx: number, config: any, tagName: string, releaseType: 'unified' | 'single' = 'single') {
  const session = buildSessions.get(sessionId);
  if (!session) return;
  const pkg = session.packages[idx];

  pkg.status = 'triggering';
  pkg.progress = 10;
  saveBuildSessionToDb(session);

  const credentials = Buffer.from(`${config.username}:${config.api_token}`).toString('base64');
  const baseUrl = config.jenkins_url.replace(/\/$/, '');
  const jobName = encodeURIComponent(config.job_name);

  // Step 1: Trigger
  let buildNumber: number | null = null;
  try {
    const { res: triggerRes } = await jenkinsRequest(
      `${baseUrl}/job/${jobName}/buildWithParameters`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `version=${encodeURIComponent(tagName)}`,
      },
      credentials
    );
    // Record trigger time to avoid using old completed builds in fallback
    const triggerTime = Date.now();

    const location = triggerRes.headers.location as string | undefined;
    if (location) {
      const queueUrl = new URL(location, baseUrl).href;
      let attempts = 0;
      while (attempts < 150) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const { body: queueBody } = await jenkinsRequest(`${queueUrl}api/json`, {}, credentials);
          const queueData = JSON.parse(queueBody);
          if (!queueData.inQueue) {
            buildNumber = queueData.executable?.number ?? null;
            break;
          }
        } catch { /* ignore */ }
        attempts++;
      }
    }

    // Fallback: if queue polling timed out, poll lastBuild but only accept builds triggered AFTER our trigger time
    if (!buildNumber) {
      let attempts = 0;
      while (attempts < 300) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const { body: jobBody } = await jenkinsRequest(
            `${baseUrl}/job/${jobName}/api/json?tree=lastBuild[number,result,building,timestamp]`,
            {}, credentials
          );
          const jobData = JSON.parse(jobBody || '{}');
          const lastBuild = jobData.lastBuild;
          // Only accept this build if: not building, completed (result !== null), AND timestamp >= our trigger time
          if (lastBuild && !lastBuild.building && lastBuild.result !== null && lastBuild.timestamp >= triggerTime) {
            buildNumber = lastBuild.number;
            console.log(`[Jenkins] fallback found new build: ${buildNumber} triggered after ${new Date(triggerTime).toISOString()}`);
            break;
          }
          pkg.progress = 10 + Math.min(20, attempts * 0.1);
        } catch { /* ignore */ }
        attempts++;
      }
    }
  } catch (err: any) {
    pkg.status = 'failed';
    pkg.error = '触发失败: ' + err.message;
    pkg.progress = 100;
    saveBuildSessionToDb(session);
    return;
  }

  console.log(`[Jenkins] package=${pkg.package_name} buildNumber=${buildNumber} (from ${!buildNumber ? 'failed' : 'queue/fallback'})`);

  pkg.build_number = buildNumber;

  if (!buildNumber) {
    pkg.status = 'failed';
    pkg.error = '无法获取 build number';
    pkg.progress = 100;
    saveBuildSessionToDb(session);
    return;
  }

  pkg.status = 'building';
  pkg.progress = 30;
  saveBuildSessionToDb(session);

  // Step 2: Poll build status
  let buildResult: string | null = null;
  let artifacts: any[] = [];
  if (buildNumber) {
    let attempts = 0;
    while (attempts < 300) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const { body } = await jenkinsRequest(`${baseUrl}/job/${jobName}/${buildNumber}/api/json`, {}, credentials);
        const data = JSON.parse(body || '{}');
        if (!data.building) {
          buildResult = data.result;
          artifacts = data.artifacts || [];
          console.log(`[Jenkins] package=${pkg.package_name} build=${buildNumber} result=${buildResult} artifacts=${artifacts.length}`);
          pkg.progress = 60;
          break;
        }
        pkg.progress = 30 + Math.min(29, attempts * 0.5);
      } catch (e: any) { console.error(`[Jenkins] poll error: ${e.message}`); /* ignore */ }
      attempts++;
    }
  } else {
    pkg.status = 'failed';
    pkg.error = '无法获取 build number';
    pkg.progress = 100;
    saveBuildSessionToDb(session);
    return;
  }

  if (!buildResult) {
    pkg.status = 'failed';
    pkg.error = '构建超时';
    pkg.progress = 100;
    saveBuildSessionToDb(session);
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
  saveBuildSessionToDb(session);

  // Step 3: Download all matched artifacts
  const pattern = config.artifact_pattern || '*.zip';
  const matchedArtifacts = artifacts.filter((a: any) => matchGlob(a.relativePath, pattern));

  if (matchedArtifacts.length === 0) {
    pkg.status = 'completed';
    pkg.artifact_name = null;
    pkg.artifact_names = [];
    pkg.artifact_sizes = [];
    pkg.error = `未找到匹配 "${pattern}" 的产物`;
    pkg.progress = 100;
    saveBuildSessionToDb(session);
    return;
  }

  pkg.artifact_names = matchedArtifacts.map((a: any) => path.basename(a.relativePath));

  // New schema: releases is main table, packages has releases_id foreign key
  // Release creation order: releases -> packages (with releases_id) -> assets (with package_id)

  // For unified releases: all packages share one release (by tag_name)
  // For single releases: each package gets its own release
  let releaseId: number | null = null;

  if (releaseType === 'unified') {
    // Check if a release with this tag_name already exists (for unified, reuse it)
    const existingRelease = getDb().prepare(
      'SELECT id FROM releases WHERE tag_name = ? LIMIT 1'
    ).get(tagName) as any;
    releaseId = existingRelease?.id;

    if (!releaseId) {
      const unifiedSessionId = sessionId;
      getDb().prepare(
        'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, unified_session_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(tagName, `Build #${buildNumber}`, '', 0, 0, releaseType, unifiedSessionId);
      const newRelease = getDb().prepare('SELECT id FROM releases WHERE tag_name = ? LIMIT 1').get(tagName) as any;
      releaseId = newRelease?.id;
    }
  } else {
    // Single release: check if this package already has a release with this tag_name
    const existingRelease = getDb().prepare(
      'SELECT r.id FROM releases r WHERE r.tag_name = ? AND r.id = (SELECT p.releases_id FROM packages p WHERE p.id = ?) LIMIT 1'
    ).get(tagName, config.package_id) as any;
    releaseId = existingRelease?.id;

    if (!releaseId) {
      getDb().prepare(
        'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, unified_session_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(tagName, `Build #${buildNumber}`, '', 0, 0, releaseType, null);
      const newRelease = getDb().prepare('SELECT id FROM releases WHERE tag_name = ? LIMIT 1').get(tagName) as any;
      releaseId = newRelease?.id;
    }
  }

  // Create or update package with releases_id
  const existingPackage = getDb().prepare('SELECT id FROM packages WHERE id = ?').get(config.package_id) as any;
  if (existingPackage) {
    getDb().prepare(
      'UPDATE packages SET releases_id = ?, version = ?, description = ?, homepage = ? WHERE id = ?'
    ).run(releaseId, tagName, `Build #${buildNumber}`, config.homepage || '', config.package_id);
  }

  console.log(`[Jenkins] release created: id=${releaseId} tag=${tagName} pkg=${config.package_id}`);

  // Download all matched artifacts sequentially
  const total = matchedArtifacts.length;
  const downloadedNames: string[] = [];
  const downloadedSizes: number[] = [];
  let failed = false;

  for (let idx = 0; idx < matchedArtifacts.length; idx++) {
    const matched = matchedArtifacts[idx];
    const artifactPath = matched.relativePath;
    const artifactUrl = `${baseUrl}/job/${jobName}/${buildNumber}/artifact/${encodeURIComponent(artifactPath)}`;
    const fileName = path.basename(artifactPath);
    const localPath = path.join(uploadsDir, `${uuidv4()}_${fileName}`);

    try {
      await downloadFile(artifactUrl, localPath, credentials);
      const fileSize = fs.statSync(localPath).size;
      // New schema: assets.package_id is FK to packages
      getDb().prepare(
        'INSERT INTO assets (package_id, name, size, file_path) VALUES (?, ?, ?, ?)'
      ).run(config.package_id, fileName, fileSize, localPath);
      downloadedNames.push(fileName);
      downloadedSizes.push(fileSize);
    } catch (err: any) {
      failed = true;
      console.error(`[Jenkins] download error: ${fileName} - ${err.message}`);
    }
    pkg.progress = 70 + Math.round(((idx + 1) / total) * 30);
  }

  pkg.artifact_name = downloadedNames[0] || null;
  pkg.artifact_names = downloadedNames;
  pkg.artifact_sizes = downloadedSizes;
  pkg.artifact_size = downloadedSizes[0] || null;

  if (failed && downloadedNames.length === 0) {
    pkg.status = 'failed';
    pkg.error = '所有产物下载失败';
  } else {
    pkg.status = 'completed';
    if (failed) {
      pkg.error = `部分产物下载失败: ${pkg.artifact_names.join(', ')}`;
    }
  }
  pkg.progress = 100;
}

// GET /api/admin/jenkins-build/session/:sessionId
router.get('/jenkins-build/session/:sessionId', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  // Try memory first, then database
  let session: BuildSession | undefined = buildSessions.get(req.params.sessionId);
  if (!session) {
    session = getBuildSessionFromDb(req.params.sessionId) ?? undefined;
  }
  if (!session) return res.status(404).json({ error: '构建会话不存在或已过期' });
  res.json(session);
});

// GET /api/admin/jenkins-build/active - Get active running session
router.get('/jenkins-build/active', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  // Try memory first, then database
  let session: BuildSession | undefined = Array.from(buildSessions.values()).find(s => s.overall_status === 'running');
  if (!session) {
    session = getActiveBuildSessionFromDb() ?? undefined;
  }
  if (!session) return res.status(404).json({ error: '没有正在进行的构建任务' });
  res.json(session);
});

// GET /api/admin/jenkins-build/history
router.get('/jenkins-build/history', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  // Get from database
  const db = getDb();
  const sessions = db.prepare("SELECT * FROM build_sessions ORDER BY created_at DESC LIMIT 20").all() as any[];
  const result = sessions.map(s => getBuildSessionFromDb(s.id)).filter(Boolean);
  res.json(result);
});
router.post('/jenkins-build/single-release', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { package_id } = req.body;
    if (!package_id) return res.status(400).json({ error: '缺少 package_id' });

    const config: any = getDb().prepare(`
      SELECT jc.*, p.name as package_name, COALESCE(p.alias, p.name) as display_name
      FROM jenkins_configs jc
      JOIN packages p ON jc.package_id = p.id
      WHERE jc.package_id = ?
    `).get(package_id);
    if (!config) return res.status(404).json({ error: '该包未配置 Jenkins，请先配置' });

    const credentials = Buffer.from(`${config.username}:${config.api_token}`).toString('base64');
    const baseUrl = config.jenkins_url.replace(/\/$/, '');
    const jobName = encodeURIComponent(config.job_name);

    // Step 1: Trigger build with version parameter (single release uses patch++)
    let buildNumber: number | null = null;
    // Find the latest release tag_name directly from releases table
    const latestRelease = getDb().prepare(
      'SELECT tag_name FROM releases ORDER BY created_at DESC LIMIT 1'
    ).get() as any;
    const tagName = incrementVersion(latestRelease?.tag_name, 'patch');
    const triggerTime = Date.now();

    try {
      const { res: triggerRes } = await jenkinsRequest(
        `${baseUrl}/job/${jobName}/buildWithParameters`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `version=${encodeURIComponent(tagName)}`,
        },
        credentials
      );

      const location = triggerRes.headers.location as string | undefined;
      if (location) {
        // Poll queue to get actual build number
        const queueUrl = new URL(location, baseUrl).href;
        let attempts = 0;
        while (attempts < 150) {
          await new Promise(r => setTimeout(r, 2000));
          const { body: queueBody } = await jenkinsRequest(`${queueUrl}api/json`, {}, credentials);
          const queueData = JSON.parse(queueBody);
          if (!queueData.inQueue) {
            buildNumber = queueData.executable?.number ?? null;
            break;
          }
          attempts++;
        }
      }

      // Fallback: poll lastBuild but only accept builds triggered AFTER our trigger time
      if (!buildNumber) {
        let attempts = 0;
        while (attempts < 300) {
          await new Promise(r => setTimeout(r, 2000));
          try {
            const { body: jobBody } = await jenkinsRequest(
              `${baseUrl}/job/${jobName}/api/json?tree=lastBuild[number,result,building,timestamp]`,
              {}, credentials
            );
            const jobData = JSON.parse(jobBody || '{}');
            const lastBuild = jobData.lastBuild;
            // Only accept this build if: not building, completed (result !== null), AND timestamp >= our trigger time
            if (lastBuild && !lastBuild.building && lastBuild.result !== null && lastBuild.timestamp >= triggerTime) {
              buildNumber = lastBuild.number;
              console.log(`[Jenkins] fallback found new build: ${buildNumber} triggered after ${new Date(triggerTime).toISOString()}`);
              break;
            }
          } catch { /* ignore */ }
          attempts++;
        }
      }
    } catch (err: any) {
      return res.status(502).json({ error: '触发 Jenkins 构建失败: ' + err.message });
    }

    if (!buildNumber) {
      // Couldn't get build number, create a release anyway
      // New schema: releases -> packages (with releases_id)
      getDb().prepare(
        'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, unified_session_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(tagName, `Build triggered`, '', 0, 0, 'single', null);
      const release = getDb().prepare('SELECT id FROM releases WHERE tag_name = ? LIMIT 1').get(tagName) as any;
      const releaseId = release?.id;

      return res.status(202).json({
        triggered: true,
        buildNumber: null,
        releaseId,
        tagName,
        status: 'queued',
        message: '构建已触发，等待 Jenkins 分配 build number',
      });
    }

    // Step 2: Poll build status until complete
    let buildResult: string | null = null;
    let artifacts: any[] = [];
    let attempts = 0;
    const maxAttempts = 400; // 10 min max

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

    // Step 3: Find all matching artifacts
    const pattern = config.artifact_pattern || '*.zip';
    const matchedArtifacts = artifacts.filter((a: any) => matchGlob(a.relativePath, pattern));

    if (matchedArtifacts.length === 0) {
      // New schema: releases are standalone, packages are project configs
      getDb().prepare(
        'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, unified_session_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(tagName, `Build #${buildNumber}`, '', 0, 0, 'single', null);
      const release = getDb().prepare('SELECT id FROM releases WHERE tag_name = ? LIMIT 1').get(tagName) as any;
      const releaseId = release?.id;

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

    // Step 4: Create release
    // New schema: releases -> packages (with releases_id)
    getDb().prepare(
      'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, unified_session_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(tagName, `Build #${buildNumber}`, '', 0, 0, 'single', null);
    const release = getDb().prepare('SELECT id FROM releases WHERE tag_name = ? LIMIT 1').get(tagName) as any;
    const releaseId = release?.id;

    // Step 5: Download all matched artifacts sequentially
    const downloaded: { name: string; size: number }[] = [];
    let downloadFailed = false;

    for (const matched of matchedArtifacts) {
      const artifactPath = matched.relativePath;
      const artifactUrl = `${baseUrl}/job/${jobName}/${buildNumber}/artifact/${encodeURIComponent(artifactPath)}`;
      const fileName = path.basename(artifactPath);
      const localPath = path.join(uploadsDir, `${uuidv4()}_${fileName}`);

      try {
        await downloadFile(artifactUrl, localPath, credentials);
        const fileSize = fs.statSync(localPath).size;
        // New schema: assets.package_id is FK to packages
        getDb().prepare(
          'INSERT INTO assets (package_id, name, size, file_path) VALUES (?, ?, ?, ?)'
        ).run(package_id, fileName, fileSize, localPath);
        downloaded.push({ name: fileName, size: fileSize });
      } catch (err: any) {
        downloadFailed = true;
        console.error(`[Jenkins] download failed: ${fileName} - ${err.message}`);
      }
    }

    if (downloaded.length === 0) {
      return res.status(502).json({ error: '所有产物下载失败' });
    }

    res.status(201).json({
      triggered: true,
      buildNumber,
      result: 'SUCCESS',
      status: downloadFailed ? 'partial' : 'completed',
      releaseId,
      tagName,
      artifactNames: downloaded.map(d => d.name),
      artifactSizes: downloaded.map(d => d.size),
      message: downloadFailed ? '部分产物下载失败' : undefined,
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
