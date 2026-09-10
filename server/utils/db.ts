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
