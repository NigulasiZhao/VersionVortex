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
          return { lastInsertRowid: sqliteDb.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] };
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
        const r1 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v2.1.0', 'Version 2.1.0 - 新功能更新',
          `## 新增功能\n\n- 支持批量版本发布\n- 新增版本对比功能\n- 添加黑暗模式支持\n\n## 改进\n\n- 优化了大文件上传速度，提升 40%\n- 改进了版本列表的加载性能\n\n## 修复\n\n- 修复了特定网络环境下上传失败的问题`, 0, 0);

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r1.lastInsertRowid, 'VersionManage-2.1.0-win64.zip', 52428800, 156, 'sample/sample-win64.zip');
        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r1.lastInsertRowid, 'VersionManage-2.1.0-macos.dmg', 61200000, 89, 'sample/sample-macos.dmg');
        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r1.lastInsertRowid, 'VersionManage-2.1.0-linux.tar.gz', 48000000, 42, 'sample/sample-linux.tar.gz');

        const r2 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v2.0.5', 'Version 2.0.5 - Bug 修复版本',
          `## 修复内容\n\n- 修复了登录页面无法记住密码的问题\n- 修复了版本删除后文件未清理的问题\n\n## 改进\n\n- 提升了整体稳定性`, 0, 0);

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r2.lastInsertRowid, 'VersionManage-2.0.5-win64.zip', 51000000, 234, 'sample/sample-win64.zip');
        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r2.lastInsertRowid, 'VersionManage-2.0.5-macos.dmg', 59000000, 112, 'sample/sample-macos.dmg');

        const r3 = dbWrapper.prepare(
          'INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(pkg.id, 'v2.0.0-beta', 'Version 2.0.0 Beta',
          `## 重大更新\n\n- 全新设计的用户界面\n- 支持多语言\n- 插件系统`, 0, 1);

        dbWrapper.prepare('INSERT INTO assets (release_id, name, size, download_count, file_path) VALUES (?, ?, ?, ?, ?)')
          .run(r3.lastInsertRowid, 'VersionManage-2.0.0-beta-win64.zip', 55000000, 567, 'sample/sample-win64.zip');
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
