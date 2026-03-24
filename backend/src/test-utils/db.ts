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
    CREATE TABLE packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      homepage TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      tag_name TEXT NOT NULL,
      title TEXT,
      body TEXT,
      is_draft INTEGER DEFAULT 0,
      is_prerelease INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (package_id) REFERENCES packages(id)
    )
  `);

  db.run(`
    CREATE TABLE assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      package_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      file_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (release_id) REFERENCES releases(id),
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
  // Insert test packages
  db.run(`INSERT INTO packages (name, description, homepage) VALUES ('app-a', 'Application A', 'https://example.com/a')`);
  db.run(`INSERT INTO packages (name, description, homepage) VALUES ('app-b', 'Application B', 'https://example.com/b')`);

  // Insert test releases
  db.run(`INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (1, 'v1.0.0', 'First Release', 'Initial release', 0, 0, '2024-01-15T10:00:00Z')`);
  db.run(`INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (1, 'v1.1.0', 'Second Release', 'Bug fixes', 0, 0, '2024-02-20T10:00:00Z')`);
  db.run(`INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (2, 'v2.0.0', 'Major Release', 'New features', 0, 0, '2024-03-10T10:00:00Z')`);
  db.run(`INSERT INTO releases (package_id, tag_name, title, body, is_draft, is_prerelease, created_at) VALUES (1, 'v2.0.0-beta', 'Beta Release', 'Beta testing', 0, 1, '2024-04-01T10:00:00Z')`);

  // Insert test assets
  db.run(`INSERT INTO assets (release_id, package_id, name, size, download_count, file_path) VALUES (1, 1, 'app-a-1.0.0.zip', 1024000, 100, 'sample/app-a.zip')`);
  db.run(`INSERT INTO assets (release_id, package_id, name, size, download_count, file_path) VALUES (2, 1, 'app-a-1.1.0.zip', 1152000, 50, 'sample/app-a-1.1.zip')`);
  db.run(`INSERT INTO assets (release_id, package_id, name, size, download_count, file_path) VALUES (3, 2, 'app-b-2.0.0.zip', 2048000, 25, 'sample/app-b.zip')`);
}
