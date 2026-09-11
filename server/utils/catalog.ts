import type { DatabaseSync } from "node:sqlite";

// Pure SQL against the connection — no Nuxt, so vitest runs these with
// openDb(":memory:"). Route handlers stay one-liners on top.

const LINK_COLUMNS =
  "id, category_id, kind, title, description, url, file_name, file_mime, file_size, icon_updated_at AS icon_version, position, created_at";

export function listCatalog(db: DatabaseSync): CategoryWithLinks[] {
  const categories = db
    .prepare("SELECT * FROM categories ORDER BY position, id")
    .all() as unknown as Category[];
  const links = db
    .prepare(`SELECT ${LINK_COLUMNS} FROM links ORDER BY position, id`)
    .all() as unknown as Link[];
  const byCategory = new Map<number, Link[]>();
  for (const link of links) {
    const list = byCategory.get(link.category_id) ?? [];
    list.push(link);
    byCategory.set(link.category_id, list);
  }
  return categories.map((c) => Object.assign(c, { links: byCategory.get(c.id) ?? [] }));
}

export function createCategory(db: DatabaseSync, input: CategoryInput): Category {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO categories (name, description, icon, position)
       VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM categories))`,
    )
    .run(input.name, input.description ?? null, input.icon);
  return getCategory(db, Number(lastInsertRowid)) as Category;
}

export function getCategory(db: DatabaseSync, id: number): Category | undefined {
  return db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category | undefined;
}

export function updateCategory(
  db: DatabaseSync,
  id: number,
  input: CategoryInput,
): Category | undefined {
  db.prepare("UPDATE categories SET name = ?, description = ?, icon = ? WHERE id = ?").run(
    input.name,
    input.description ?? null,
    input.icon,
    id,
  );
  return getCategory(db, id);
}

/** Deletes the category and its links; returns the stored file names to unlink. */
export function deleteCategory(db: DatabaseSync, id: number): string[] | undefined {
  const rows = db
    .prepare("SELECT stored_name, icon_stored_name FROM links WHERE category_id = ?")
    .all(id) as unknown as StoredNames[];
  const { changes } = db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  if (changes === 0) return undefined;
  return rows.flatMap(storedNames);
}

interface StoredNames {
  stored_name: string | null;
  icon_stored_name: string | null;
}
function storedNames(row: StoredNames): string[] {
  return [row.stored_name, row.icon_stored_name].filter((n): n is string => Boolean(n));
}

export function reorderCategories(db: DatabaseSync, ids: number[]): void {
  const stmt = db.prepare("UPDATE categories SET position = ? WHERE id = ?");
  db.exec("BEGIN");
  try {
    ids.forEach((id, i) => stmt.run(i, id));
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export interface StoredFile {
  file_name: string;
  stored_name: string;
  file_mime: string;
  file_size: number;
}

export function createUrlLink(db: DatabaseSync, input: UrlLinkInput): Link {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO links (category_id, kind, title, description, url, position)
       VALUES (?, 'url', ?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM links WHERE category_id = ?))`,
    )
    .run(input.category_id, input.title, input.description ?? null, input.url, input.category_id);
  return getLink(db, Number(lastInsertRowid)) as Link;
}

export function createFileLink(db: DatabaseSync, input: FileLinkInput, file: StoredFile): Link {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO links (category_id, kind, title, description, file_name, stored_name, file_mime, file_size, position)
       VALUES (?, 'file', ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM links WHERE category_id = ?))`,
    )
    .run(
      input.category_id,
      input.title,
      input.description ?? null,
      file.file_name,
      file.stored_name,
      file.file_mime,
      file.file_size,
      input.category_id,
    );
  return getLink(db, Number(lastInsertRowid)) as Link;
}

export function getLink(db: DatabaseSync, id: number): Link | undefined {
  return db.prepare(`SELECT ${LINK_COLUMNS} FROM links WHERE id = ?`).get(id) as Link | undefined;
}

/** What the download route needs and the public API never exposes. */
export function getStoredFile(db: DatabaseSync, id: number): StoredFile | undefined {
  return db
    .prepare(
      "SELECT file_name, stored_name, file_mime, file_size FROM links WHERE id = ? AND kind = 'file'",
    )
    .get(id) as StoredFile | undefined;
}

export function updateLink(db: DatabaseSync, id: number, input: LinkUpdateInput): Link | undefined {
  const current = getLink(db, id);
  if (!current) return undefined;
  const url = current.kind === "url" ? (input.url ?? current.url) : null;
  const position =
    input.category_id === current.category_id
      ? current.position
      : ((
          db
            .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM links WHERE category_id = ?")
            .get(input.category_id) as { p: number }
        ).p ?? 0);
  db.prepare(
    "UPDATE links SET category_id = ?, title = ?, description = ?, url = ?, position = ? WHERE id = ?",
  ).run(input.category_id, input.title, input.description ?? null, url, position, id);
  return getLink(db, id);
}

/** Deletes the link; returns the stored file names (file, icon) to unlink. */
export function deleteLink(db: DatabaseSync, id: number): string[] | undefined {
  const row = db.prepare("SELECT stored_name, icon_stored_name FROM links WHERE id = ?").get(id) as
    | StoredNames
    | undefined;
  if (!row) return undefined;
  db.prepare("DELETE FROM links WHERE id = ?").run(id);
  return storedNames(row);
}

export function reorderLinks(db: DatabaseSync, ids: number[]): void {
  const stmt = db.prepare("UPDATE links SET position = ? WHERE id = ?");
  db.exec("BEGIN");
  try {
    ids.forEach((id, i) => stmt.run(i, id));
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// ── Site settings (singleton row) ────────────────────────────────

export interface StoredImage {
  stored_name: string;
  mime: string;
}

/** What the public API exposes — never the stored name. */
export function getSiteSettings(db: DatabaseSync): SiteSettings {
  const row = db.prepare("SELECT logo_updated_at FROM site WHERE id = 1").get() as {
    logo_updated_at: string | null;
  };
  return { logo_version: row.logo_updated_at };
}

/** What the logo route needs. */
export function getLogo(db: DatabaseSync): StoredImage | undefined {
  const row = db
    .prepare("SELECT logo_stored_name AS stored_name, logo_mime AS mime FROM site WHERE id = 1")
    .get() as { stored_name: string | null; mime: string | null };
  return row.stored_name && row.mime ? { stored_name: row.stored_name, mime: row.mime } : undefined;
}

/** Replaces the logo; returns the previous stored name to unlink, if any. */
export function setLogo(db: DatabaseSync, logo: StoredImage | null): string | null {
  const previous = getLogo(db)?.stored_name ?? null;
  db.prepare(
    `UPDATE site SET logo_stored_name = ?, logo_mime = ?,
       logo_updated_at = CASE WHEN ? IS NULL THEN NULL ELSE strftime('%Y%m%d%H%M%f', 'now') END
     WHERE id = 1`,
  ).run(logo?.stored_name ?? null, logo?.mime ?? null, logo?.stored_name ?? null);
  return previous;
}

// ── Link icons ───────────────────────────────────────────────────

/** What the icon route needs. */
export function getLinkIcon(db: DatabaseSync, id: number): StoredImage | undefined {
  const row = db
    .prepare("SELECT icon_stored_name AS stored_name, icon_mime AS mime FROM links WHERE id = ?")
    .get(id) as { stored_name: string | null; mime: string | null } | undefined;
  return row?.stored_name && row.mime
    ? { stored_name: row.stored_name, mime: row.mime }
    : undefined;
}

/**
 * Replaces the icon; returns the previous stored name to unlink (null when
 * there was none), or undefined when the link does not exist.
 */
export function setLinkIcon(
  db: DatabaseSync,
  id: number,
  icon: StoredImage | null,
): string | null | undefined {
  if (!getLink(db, id)) return undefined;
  const previous = getLinkIcon(db, id)?.stored_name ?? null;
  db.prepare(
    `UPDATE links SET icon_stored_name = ?, icon_mime = ?,
       icon_updated_at = CASE WHEN ? IS NULL THEN NULL ELSE strftime('%Y%m%d%H%M%f', 'now') END
     WHERE id = ?`,
  ).run(icon?.stored_name ?? null, icon?.mime ?? null, icon?.stored_name ?? null, id);
  return previous;
}
