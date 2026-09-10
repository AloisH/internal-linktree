import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

// ponytail: migrations are an ordered array of SQL applied above PRAGMA
// user_version — append, never edit a past entry. Reach for Drizzle when a
// query gets painful to write by hand, not before.
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE messages (
     id         INTEGER PRIMARY KEY,
     name       TEXT NOT NULL,
     email      TEXT NOT NULL,
     body       TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
   )`,
  // v2 — the link portal: categories hold links to apps (url) or uploaded
  // files. The starter's contact form is gone with it.
  `DROP TABLE messages;
   CREATE TABLE categories (
     id          INTEGER PRIMARY KEY,
     name        TEXT NOT NULL,
     description TEXT,
     icon        TEXT NOT NULL DEFAULT 'i-lucide-folder',
     position    INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
   );
   CREATE TABLE links (
     id          INTEGER PRIMARY KEY,
     category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
     kind        TEXT NOT NULL CHECK (kind IN ('url', 'file')),
     title       TEXT NOT NULL,
     description TEXT,
     url         TEXT,
     file_name   TEXT,
     stored_name TEXT,
     file_mime   TEXT,
     file_size   INTEGER,
     position    INTEGER NOT NULL DEFAULT 0,
     created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
   );
   CREATE INDEX links_category ON links (category_id, position);`,
];

export function openDb(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  return db;
}

/** Applies pending migrations; returns the schema version afterwards. */
export function migrate(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v] as string);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
  return MIGRATIONS.length;
}

let db: DatabaseSync | undefined;

/** Process-wide connection, opened (and migrated) on first use. */
export function useDb(): DatabaseSync {
  db ??= openDb(useRuntimeConfig().dbPath);
  return db;
}
