import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data.db');
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure directories exist
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Global db instance
let db: SqlJsDatabase;
let dbReady: Promise<void>;

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save every 30 seconds
setInterval(saveDb, 30000);

// Wrapper to provide better-sqlite3-like API
function createWrapper(sqliteDb: SqlJsDatabase) {
  return {
    prepare(sql: string) {
      return {
        run(...params: any[]) {
          // Use prepare + step to execute and properly get last_insert_rowid
          const stmt = sqliteDb.prepare(sql);
          stmt.bind(params);
          stmt.step();
          stmt.free();
          // Now get the last insert rowid
          const lastIdResult = sqliteDb.exec('SELECT last_insert_rowid() as id');
          const rowid = lastIdResult.length > 0 && lastIdResult[0].values.length > 0
            ? lastIdResult[0].values[0][0] as number
            : 0;
          saveDb();
          return { lastInsertRowid: rowid };
        },
        get(...params: any[]) {
          const stmt = sqliteDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            stmt.free();
            const row: any = {};
            columns.forEach((col, i) => { row[col] = values[i]; });
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params: any[]) {
          const stmt = sqliteDb.prepare(sql);
          stmt.bind(params);
          const rows: any[] = [];
          const columns = stmt.getColumnNames();
          while (stmt.step()) {
            const values = stmt.get();
            const row: any = {};
            columns.forEach((col, i) => { row[col] = values[i]; });
            rows.push(row);
          }
          stmt.free();
          return rows;
        },
      };
    },
    exec(sql: string) {
      sqliteDb.exec(sql);
      saveDb();
    },
    pragma(cmd: string) {
      sqliteDb.exec(`PRAGMA ${cmd}`);
    },
  };
}

let dbWrapper: ReturnType<typeof createWrapper>;

export async function initDb() {
  const SQL = await initSqlJs();

  let data: Buffer | undefined;
  if (fs.existsSync(DB_PATH)) {
    data = fs.readFileSync(DB_PATH);
  }

  db = new SQL.Database(data);
  dbWrapper = createWrapper(db);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  // Create new schema tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_name TEXT NOT NULL,
      title TEXT,
      body TEXT,
      is_draft INTEGER DEFAULT 0,
      is_prerelease INTEGER DEFAULT 0,
      release_type TEXT DEFAULT 'single',
      unified_session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      releases_id INTEGER,
      name TEXT NOT NULL,
      version TEXT,
      description TEXT,
      homepage TEXT,
      alias TEXT,
      download_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (releases_id) REFERENCES releases(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      size INTEGER NOT NULL,
      download_count INTEGER DEFAULT 0,
      file_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jenkins_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER UNIQUE NOT NULL,
      jenkins_url TEXT NOT NULL,
      job_name TEXT NOT NULL,
      username TEXT NOT NULL,
      api_token TEXT NOT NULL,
      artifact_pattern TEXT NOT NULL DEFAULT '*.zip',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS build_sessions (
      id TEXT PRIMARY KEY,
      tag_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS build_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      package_id INTEGER NOT NULL,
      package_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      build_number INTEGER,
      error TEXT,
      artifact_names TEXT,
      artifact_sizes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES build_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    );
  `);

  // Migration: Check if old schema exists and migrate data
  const oldSchemaExists = checkOldSchemaExists();

  if (oldSchemaExists) {
    migrateFromOldSchema();
  } else {
    // Also fix orphaned packages if migration already ran (lastInsertRowid bug)
    fixPackagesRelations();
  }

  // Seed default admin
  const adminExists = dbWrapper.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    dbWrapper.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }

  // Seed sample data if empty
  const releaseCount = dbWrapper.prepare('SELECT COUNT(*) as count FROM releases').get() as any;
  console.log('[DEBUG] releaseCount.count:', releaseCount.count);
  if (releaseCount.count === 0) {
    console.log('[DEBUG] Executing seedSampleData...');
    seedSampleData();
  }

  saveDb();
  return dbWrapper;
}

function fixPackagesRelations() {
  // Fix packages where releases_id = 0 due to lastInsertRowid bug
  const orphanedPackages = dbWrapper.prepare(
    'SELECT p.id, p.name, p.version, r.id as target_release_id, r.tag_name FROM packages p JOIN releases r ON p.version = r.tag_name WHERE p.releases_id = 0'
  ).all() as any[];

  if (orphanedPackages.length > 0) {
    console.log(`[DEBUG] Fixing ${orphanedPackages.length} orphaned packages...`);
    for (const pkg of orphanedPackages) {
      dbWrapper.prepare('UPDATE packages SET releases_id = ? WHERE id = ?').run(pkg.target_release_id, pkg.id);
      console.log(`[DEBUG] Fixed package ${pkg.name} (${pkg.version}) -> release ${pkg.tag_name}`);
    }
  }
}

function checkOldSchemaExists(): boolean {
  try {
    // Check if old releases table has package_id column (old schema indicator)
    const result = db.exec("PRAGMA table_info(releases)");
    const columns = result[0]?.values?.map((row: any) => row[1]) || [];
    return columns.includes('package_id');
  } catch {
    return false;
  }
}

function migrateFromOldSchema() {
  console.log('Migrating from old schema to new schema...');

  // SQLite ALTER TABLE only supports RENAME TABLE and ADD COLUMN
  // To change package_id constraint, we need to rename old tables and recreate
  db.exec('ALTER TABLE releases RENAME TO old_releases');
  db.exec('ALTER TABLE packages RENAME TO old_packages');
  db.exec('ALTER TABLE assets RENAME TO old_assets');

  // Create new schema tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_name TEXT NOT NULL,
      title TEXT,
      body TEXT,
      is_draft INTEGER DEFAULT 0,
      is_prerelease INTEGER DEFAULT 0,
      release_type TEXT DEFAULT 'single',
      unified_session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      releases_id INTEGER,
      name TEXT NOT NULL,
      version TEXT,
      description TEXT,
      homepage TEXT,
      alias TEXT,
      download_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (releases_id) REFERENCES releases(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      size INTEGER NOT NULL,
      download_count INTEGER DEFAULT 0,
      file_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    );
  `);

  // Get all old packages
  const oldPackages = dbWrapper.prepare('SELECT * FROM old_packages').all() as any[];
  const oldReleases = dbWrapper.prepare('SELECT * FROM old_releases').all() as any[];
  const oldAssets = dbWrapper.prepare('SELECT * FROM old_assets').all() as any[];

  // Group old releases by package_id for unified releases
  const releasesByPackage: Record<number, any[]> = {};
  for (const rel of oldReleases) {
    if (!releasesByPackage[rel.package_id]) {
      releasesByPackage[rel.package_id] = [];
    }
    releasesByPackage[rel.package_id].push(rel);
  }

  // For each old package, create unified releases
  for (const oldPkg of oldPackages) {
    const pkgReleases = releasesByPackage[oldPkg.id] || [];

    if (pkgReleases.length === 0) {
      // No releases, create a single placeholder release for this package
      const releaseResult = dbWrapper.prepare(
        'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('v0.0.0', `${oldPkg.name} - Initial`, 'Initial release', 0, 0, 'single');

      dbWrapper.prepare(
        'INSERT INTO packages (releases_id, name, version, description, homepage, alias, download_count) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(releaseResult.lastInsertRowid, oldPkg.name, 'v0.0.0', oldPkg.description || '', oldPkg.homepage || '', oldPkg.alias || '', 0);
    } else {
      // Create releases for each old release of this package
      for (const oldRel of pkgReleases) {
        const releaseResult = dbWrapper.prepare(
          'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          oldRel.tag_name,
          oldRel.title || '',
          oldRel.body || '',
          oldRel.is_draft || 0,
          oldRel.is_prerelease || 0,
          oldRel.release_type || 'single',
          oldRel.created_at
        );
        console.log('[DEBUG] Migration - inserted release, lastInsertRowid:', releaseResult.lastInsertRowid, 'tag:', oldRel.tag_name);

        // Calculate download_count from old assets for this release
        const releaseAssets = oldAssets.filter(a => a.release_id === oldRel.id);
        const totalDownloads = releaseAssets.reduce((sum, a) => sum + (a.download_count || 0), 0);

        // Extract version from tag_name
        const version = oldRel.tag_name.startsWith('v') ? oldRel.tag_name : `v${oldRel.tag_name}`;

        const packageResult = dbWrapper.prepare(
          'INSERT INTO packages (releases_id, name, version, description, homepage, alias, download_count) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          releaseResult.lastInsertRowid,
          oldPkg.name,
          version,
          oldPkg.description || '',
          oldPkg.homepage || '',
          oldPkg.alias || '',
          totalDownloads
        );

        const newPkgId = packageResult.lastInsertRowid;

        // Create assets for this release/package
        for (const oldAsset of releaseAssets) {
          dbWrapper.prepare(
            'INSERT INTO assets (package_id, name, size, download_count, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(
            newPkgId,
            oldAsset.name,
            oldAsset.size,
            oldAsset.download_count || 0,
            oldAsset.file_path,
            oldAsset.created_at
          );
        }
      }
    }
  }

  // Drop old tables (after migration)
  try {
    db.exec('DROP TABLE IF EXISTS old_assets');
    db.exec('DROP TABLE IF EXISTS old_releases');
    db.exec('DROP TABLE IF EXISTS old_packages');
  } catch (e) {
    // Tables may not exist
  }

  console.log('Migration completed.');
}

function seedSampleData() {
  // Create unified releases for the sample packages
  // 2026-03 unified release
  const unifiedRelease1 = dbWrapper.prepare(
    'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    'v2.1.0',
    'Version 2.1.0 - 新功能更新',
    `## 新增功能\n\n- 支持批量版本发布\n- 新增版本对比功能\n- 添加黑暗模式支持\n\n## 改进\n\n- 优化了大文件上传速度，提升 40%\n- 改进了版本列表的加载性能\n\n## 修复\n\n- 修复了特定网络环境下上传失败的问题`,
    0, 0, 'unified', '2026-03-15 10:00:00'
  );
  console.log('[DEBUG] unifiedRelease1.lastInsertRowid:', unifiedRelease1.lastInsertRowid);

  const unifiedRelease2 = dbWrapper.prepare(
    'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    'v2.0.5',
    'Version 2.0.5 - Bug 修复版本',
    `## 修复内容\n\n- 修复了登录页面无法记住密码的问题\n- 修复了版本删除后文件未清理的问题\n\n## 改进\n\n- 提升了整体稳定性`,
    0, 0, 'unified', '2026-02-20 14:30:00'
  );

  const unifiedRelease3 = dbWrapper.prepare(
    'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    'v2.0.0',
    'Version 2.0.0 - 正式版发布',
    `## 正式发布\n\n- 全新设计的用户界面\n- 支持多语言\n- 插件系统\n- 性能大幅提升`,
    0, 0, 'unified', '2026-01-10 09:00:00'
  );

  // Create packages for unified release v2.1.0
  const pkg1_r1 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(unifiedRelease1.lastInsertRowid, 'versionmanage-app', 'v2.1.0', 'VersionVortex 客户端安装包', 'https://github.com/example/versionmanage', 156);
  const pkg2_r1 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(unifiedRelease1.lastInsertRowid, 'versionmanage-cli', 'v1.3.0', 'VersionVortex 命令行工具', 'https://github.com/example/versionmanage-cli', 89);
  const pkg3_r1 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(unifiedRelease1.lastInsertRowid, 'versionmanage-sdk', 'v1.0.0', 'VersionVortex SDK 开发包', 'https://github.com/example/versionmanage-sdk', 45);

  // Create assets for each package
  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(pkg1_r1.lastInsertRowid, 'VersionVortex-2.1.0-win64.zip', 52428800, 156, 'sample/sample-win64.zip');
  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(pkg1_r1.lastInsertRowid, 'VersionVortex-2.1.0-macos.dmg', 61200000, 89, 'sample/sample-macos.dmg');
  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(pkg2_r1.lastInsertRowid, 'versionvortex-cli-1.3.0-linux.tar.gz', 8500000, 89, 'sample/sample-linux.tar.gz');
  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(pkg3_r1.lastInsertRowid, 'versionvortex-sdk-1.0.0.tgz', 1200000, 45, 'sample/sample-win64.zip');

  // Create packages for unified release v2.0.5
  const pkg1_r2 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(unifiedRelease2.lastInsertRowid, 'versionmanage-app', 'v2.0.5', 'VersionVortex 客户端安装包', 'https://github.com/example/versionmanage', 234);
  const pkg2_r2 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(unifiedRelease2.lastInsertRowid, 'versionmanage-cli', 'v1.2.0', 'VersionVortex 命令行工具', 'https://github.com/example/versionmanage-cli', 234);

  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(pkg1_r2.lastInsertRowid, 'VersionVortex-2.0.5-win64.zip', 51000000, 234, 'sample/sample-win64.zip');
  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(pkg2_r2.lastInsertRowid, 'versionvortex-cli-1.2.0-linux.tar.gz', 8200000, 234, 'sample/sample-linux.tar.gz');

  // Create packages for unified release v2.0.0
  const pkg1_r3 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(unifiedRelease3.lastInsertRowid, 'versionmanage-app', 'v2.0.0', 'VersionVortex 客户端安装包', 'https://github.com/example/versionmanage', 567);

  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(pkg1_r3.lastInsertRowid, 'VersionVortex-2.0.0-win64.zip', 55000000, 567, 'sample/sample-win64.zip');

  // Create additional single releases
  const singleRelease1 = dbWrapper.prepare(
    'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run('v1.9.0', 'Version 1.9.0 - 性能优化', `## 性能优化\n\n- 优化了启动速度\n- 减少了内存占用\n- 改进了下载体验`, 0, 0, 'single', '2025-12-05 16:00:00');

  const singlePkg1 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(singleRelease1.lastInsertRowid, 'versionmanage-app', 'v1.9.0', 'VersionVortex 客户端安装包', 'https://github.com/example/versionmanage', 890);

  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(singlePkg1.lastInsertRowid, 'VersionVortex-1.9.0-win64.zip', 48000000, 890, 'sample/sample-win64.zip');

  const singleRelease2 = dbWrapper.prepare(
    'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run('v1.8.0', 'Version 1.8.0 - 新增主题', `## 新增功能\n\n- 新增深色主题\n- 支持自定义主题色\n- 改进了设置页面`, 0, 0, 'single', '2025-11-18 11:00:00');

  const singlePkg2 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(singleRelease2.lastInsertRowid, 'versionmanage-app', 'v1.8.0', 'VersionVortex 客户端安装包', 'https://github.com/example/versionmanage', 1200);

  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(singlePkg2.lastInsertRowid, 'VersionVortex-1.8.0-win64.zip', 46000000, 1200, 'sample/sample-win64.zip');

  const singleRelease3 = dbWrapper.prepare(
    'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run('v1.7.0-beta', 'Version 1.7.0 Beta', `## Beta 测试版\n\n- 新增预览功能\n- 界面重构中\n- 欢迎反馈问题`, 0, 1, 'single', '2025-10-22 08:00:00');

  const singlePkg3 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(singleRelease3.lastInsertRowid, 'versionmanage-app', 'v1.7.0-beta', 'VersionVortex 客户端安装包', 'https://github.com/example/versionmanage', 2340);

  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(singlePkg3.lastInsertRowid, 'VersionVortex-1.7.0-beta-win64.zip', 44000000, 2340, 'sample/sample-win64.zip');

  const singleRelease4 = dbWrapper.prepare(
    'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run('v1.6.0', 'Version 1.6.0 - 安全性更新', `## 安全修复\n\n- 修复了安全漏洞\n- 增强了权限验证\n- 改进了日志审计`, 0, 0, 'single', '2025-09-30 15:00:00');

  const singlePkg4 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(singleRelease4.lastInsertRowid, 'versionmanage-app', 'v1.6.0', 'VersionVortex 客户端安装包', 'https://github.com/example/versionmanage', 3400);

  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(singlePkg4.lastInsertRowid, 'VersionVortex-1.6.0-win64.zip', 42000000, 3400, 'sample/sample-win64.zip');

  const singleRelease5 = dbWrapper.prepare(
    'INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run('v1.5.0', 'Version 1.5.0 - 开发中', `## 开发中...\n\n- 计划中的功能\n- 云同步支持\n- 协作功能`, 1, 0, 'single', '2025-08-15 10:00:00');

  const singlePkg5 = dbWrapper.prepare(
    'INSERT INTO packages (releases_id, name, version, description, homepage, download_count) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(singleRelease5.lastInsertRowid, 'versionmanage-app', 'v1.5.0', 'VersionVortex 客户端安装包', 'https://github.com/example/versionmanage', 0);

  dbWrapper.prepare('INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
    .run(singlePkg5.lastInsertRowid, 'VersionVortex-1.5.0-draft-win64.zip', 40000000, 0, 'sample/sample-win64.zip');
}

export function getDb() {
  return dbWrapper;
}

export default { getDb, initDb };
