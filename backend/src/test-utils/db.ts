import initSqlJs, { Database } from 'sql.js';

// Initialize SQL.js
let SQL: initSqlJs.SqlJsStatic;

beforeAll(async () => {
  SQL = await initSqlJs();
});

export interface TestDatabase {
  db: Database;
  close: () => void;
}

export async function createTestDb(): Promise<TestDatabase> {
  const db = new SQL.Database();

  // Create tables
  db.run(`
    CREATE TABLE releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_name TEXT NOT NULL,
      title TEXT,
      body TEXT,
      is_draft INTEGER DEFAULT 0,
      is_prerelease INTEGER DEFAULT 0,
      release_type TEXT,
      unified_session_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      releases_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      version TEXT,
      description TEXT,
      homepage TEXT,
      alias TEXT,
      download_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (releases_id) REFERENCES releases(id)
    )
  `);

  db.run(`
    CREATE TABLE assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      file_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (package_id) REFERENCES packages(id)
    )
  `);

  db.run(`
    CREATE TABLE jenkins_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      jenkins_url TEXT,
      job_name TEXT,
      username TEXT,
      api_token TEXT,
      artifact_pattern TEXT DEFAULT '*.zip',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (package_id) REFERENCES packages(id)
    )
  `);

  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE build_sessions (
      id TEXT PRIMARY KEY,
      tag_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE build_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      package_id INTEGER NOT NULL,
      package_name TEXT,
      status TEXT,
      progress INTEGER DEFAULT 0,
      build_number INTEGER,
      error TEXT,
      artifact_names TEXT,
      artifact_sizes TEXT,
      FOREIGN KEY (session_id) REFERENCES build_sessions(id)
    )
  `);

  return {
    db,
    close: () => db.close(),
  };
}

export function seedTestData(db: Database): void {
  // Insert test releases
  db.run(`INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES ('v1.0.0', 'First Release', 'Initial release', 0, 0, 'major', '2024-01-15T10:00:00Z')`);
  db.run(`INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES ('v1.1.0', 'Second Release', 'Bug fixes', 0, 0, 'minor', '2024-02-20T10:00:00Z')`);
  db.run(`INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES ('v2.0.0', 'Major Release', 'New features', 0, 0, 'major', '2024-03-10T10:00:00Z')`);
  db.run(`INSERT INTO releases (tag_name, title, body, is_draft, is_prerelease, release_type, created_at) VALUES ('v2.0.0-beta', 'Beta Release', 'Beta testing', 0, 1, 'prerelease', '2024-04-01T10:00:00Z')`);

  // Insert test packages (linked to releases)
  db.run(`INSERT INTO packages (releases_id, name, version, description, homepage, alias, download_count) VALUES (1, 'app-a', '1.0.0', 'Application A', 'https://example.com/a', '应用A', 100)`);
  db.run(`INSERT INTO packages (releases_id, name, version, description, homepage, alias, download_count) VALUES (2, 'app-a', '1.1.0', 'Application A', 'https://example.com/a', '应用A', 50)`);
  db.run(`INSERT INTO packages (releases_id, name, version, description, homepage, alias, download_count) VALUES (3, 'app-b', '2.0.0', 'Application B', 'https://example.com/b', '应用B', 25)`);

  // Insert test assets (linked to packages)
  db.run(`INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (1, 'app-a-1.0.0.zip', 1024000, 100, 'sample/app-a.zip')`);
  db.run(`INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (2, 'app-a-1.1.0.zip', 1152000, 50, 'sample/app-a-1.1.zip')`);
  db.run(`INSERT INTO assets (package_id, name, size, download_count, file_path) VALUES (3, 'app-b-2.0.0.zip', 2048000, 25, 'sample/app-b.zip')`);
}
