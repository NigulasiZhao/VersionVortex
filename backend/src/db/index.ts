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
          sqliteDb.run(sql, params);
          saveDb();
          const stmt = sqliteDb.prepare('SELECT last_insert_rowid() as id');
          stmt.step();
          const rowid = stmt.get()[0];
          stmt.free();
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

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      homepage TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      tag_name TEXT NOT NULL,
      title TEXT,
      body TEXT,
      is_draft INTEGER DEFAULT 0,
      is_prerelease INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
      UNIQUE(package_id, tag_name)
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      size INTEGER NOT NULL,
      download_count INTEGER DEFAULT 0,
      file_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
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
  `);

  // Seed default admin
  const adminExists = dbWrapper.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    dbWrapper.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }

  // Seed sample data if empty
  const count = dbWrapper.prepare('SELECT COUNT(*) as count FROM packages').get() as any;
  if (count.count === 0) {
    dbWrapper.prepare('INSERT INTO packages (name, description, homepage) VALUES (?, ?, ?)').run(
      'versionmanage-app', 'VersionManage 客户端安装包', 'https://github.com/example/versionmanage'
    );
    dbWrapper.prepare('INSERT INTO packages (name, description, homepage) VALUES (?, ?, ?)').run(
      'versionmanage-cli', 'VersionManage 命令行工具', 'https://github.com/example/versionmanage-cli'
    );
    dbWrapper.prepare('INSERT INTO packages (name, description, homepage) VALUES (?, ?, ?)').run(
      'versionmanage-sdk', 'VersionManage SDK 开发包', 'https://github.com/example/versionmanage-sdk'
    );

    const packages = dbWrapper.prepare('SELECT * FROM packages').all() as any[];

    for (const pkg of packages) {
      if (pkg.name === 'versionmanage-app') {
        // 2026-03
        const r1 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v2.1.0', 'Version 2.1.0 - 新功能更新',
          `## 新增功能\n\n- 支持批量版本发布\n- 新增版本对比功能\n- 添加黑暗模式支持\n\n## 改进\n\n- 优化了大文件上传速度，提升 40%\n- 改进了版本列表的加载性能\n\n## 修复\n\n- 修复了特定网络环境下上传失败的问题`, 0, 0, '2026-03-15 10:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r1.lastInsertRowid, 'VersionManage-2.1.0-win64.zip', 52428800, 156, 'sample/sample-win64.zip');
        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r1.lastInsertRowid, 'VersionManage-2.1.0-macos.dmg', 61200000, 89, 'sample/sample-macos.dmg');

        // 2026-02
        const r2 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v2.0.5', 'Version 2.0.5 - Bug 修复版本',
          `## 修复内容\n\n- 修复了登录页面无法记住密码的问题\n- 修复了版本删除后文件未清理的问题\n\n## 改进\n\n- 提升了整体稳定性`, 0, 0, '2026-02-20 14:30:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r2.lastInsertRowid, 'VersionManage-2.0.5-win64.zip', 51000000, 234, 'sample/sample-win64.zip');

        // 2026-01
        const r3 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v2.0.0', 'Version 2.0.0 - 正式版发布',
          `## 正式发布\n\n- 全新设计的用户界面\n- 支持多语言\n- 插件系统\n- 性能大幅提升`, 0, 0, '2026-01-10 09:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r3.lastInsertRowid, 'VersionManage-2.0.0-win64.zip', 55000000, 567, 'sample/sample-win64.zip');

        // 2025-12
        const r4 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v1.9.0', 'Version 1.9.0 - 性能优化',
          `## 性能优化\n\n- 优化了启动速度\n- 减少了内存占用\n- 改进了下载体验`, 0, 0, '2025-12-05 16:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r4.lastInsertRowid, 'VersionManage-1.9.0-win64.zip', 48000000, 890, 'sample/sample-win64.zip');

        // 2025-11
        const r5 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v1.8.0', 'Version 1.8.0 - 新增主题',
          `## 新增功能\n\n- 新增深色主题\n- 支持自定义主题色\n- 改进了设置页面`, 0, 0, '2025-11-18 11:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r5.lastInsertRowid, 'VersionManage-1.8.0-win64.zip', 46000000, 1200, 'sample/sample-win64.zip');

        // 2025-10
        const r6 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v1.7.0-beta', 'Version 1.7.0 Beta',
          `## Beta 测试版\n\n- 新增预览功能\n- 界面重构中\n- 欢迎反馈问题`, 0, 1, '2025-10-22 08:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r6.lastInsertRowid, 'VersionManage-1.7.0-beta-win64.zip', 44000000, 2340, 'sample/sample-win64.zip');

        // 2025-09
        const r7 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v1.6.0', 'Version 1.6.0 - 安全性更新',
          `## 安全修复\n\n- 修复了安全漏洞\n- 增强了权限验证\n- 改进了日志审计`, 0, 0, '2025-09-30 15:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r7.lastInsertRowid, 'VersionManage-1.6.0-win64.zip', 42000000, 3400, 'sample/sample-win64.zip');

        // 2025-08 (Draft)
        const r8 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v1.5.0', 'Version 1.5.0 - 开发中',
          `## 开发中...\n\n- 计划中的功能\n- 云同步支持\n- 协作功能`, 0, 0, '2025-08-15 10:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r8.lastInsertRowid, 'VersionManage-1.5.0-draft-win64.zip', 40000000, 0, 'sample/sample-win64.zip');
        dbWrapper.exec(`UPDATE releases SET is_draft = 1 WHERE id = ${r8.lastInsertRowid}`);
      }

      if (pkg.name === 'versionmanage-cli') {
        // 2026-03
        const r1 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v1.3.0', 'CLI v1.3.0 - 新增命令',
          `## 新增命令\n\n- vm release publish\n- vm package list\n- vm config set\n\n## 修复\n\n- 修复了网络超时问题`, 0, 0, '2026-03-10 12:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r1.lastInsertRowid, 'versionmanage-cli-1.3.0-linux.tar.gz', 8500000, 89, 'sample/sample-linux.tar.gz');

        // 2026-01
        const r2 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v1.2.0', 'CLI v1.2.0 - 性能提升',
          `## 改进\n\n- 启动速度提升 50%\n- 新增进度显示\n- 更好的错误提示`, 0, 0, '2026-01-25 09:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r2.lastInsertRowid, 'versionmanage-cli-1.2.0-linux.tar.gz', 8200000, 234, 'sample/sample-linux.tar.gz');

        // 2025-11
        const r3 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v1.1.0', 'CLI v1.1.0',
          `## 初始版本\n\n- 基础命令支持\n- 登录认证\n- 包管理功能`, 0, 0, '2025-11-01 10:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r3.lastInsertRowid, 'versionmanage-cli-1.1.0-linux.tar.gz', 7800000, 567, 'sample/sample-linux.tar.gz');
      }

      if (pkg.name === 'versionmanage-sdk') {
        // 2026-02
        const r1 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v1.0.0', 'SDK v1.0.0 - 正式发布',
          `## 正式发布\n\n- 完整的 API 封装\n- TypeScript 支持\n- 完善的文档\n- 5 个示例项目`, 0, 0, '2026-02-28 14:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r1.lastInsertRowid, 'versionmanage-sdk-1.0.0.tgz', 1200000, 45, 'sample/sample-win64.zip');

        // 2025-12
        const r2 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v0.9.0-beta', 'SDK v0.9.0 Beta',
          `## Beta 测试\n\n- API 预览版\n- 欢迎测试反馈`, 0, 1, '2025-12-20 11:00:00');

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r2.lastInsertRowid, 'versionmanage-sdk-0.9.0-beta.tgz', 1100000, 123, 'sample/sample-win64.zip');
      }
    }
  }

  saveDb();
  return dbWrapper;
}

export function getDb() {
  return dbWrapper;
}

export default { getDb, initDb };
