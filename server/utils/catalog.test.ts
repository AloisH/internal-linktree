import { describe, expect, it } from "vitest";
import {
  createCategory,
  createFileLink,
  createUrlLink,
  deleteCategory,
  deleteLink,
  getLink,
  getLinkIcon,
  getLogo,
  getSiteSettings,
  getStoredFile,
  listCatalog,
  setLinkIcon,
  setLogo,
  reorderCategories,
  reorderLinks,
  updateLink,
} from "./catalog";
import { openDb } from "./db";

const file = {
  file_name: "a.pdf",
  stored_name: "x.pdf",
  file_mime: "application/pdf",
  file_size: 3,
};

describe("catalog", () => {
  it("creates categories and links in insertion order, grouped", () => {
    const db = openDb(":memory:");
    const a = createCategory(db, { name: "Outils", icon: "i-lucide-folder" });
    const b = createCategory(db, { name: "Documents", icon: "i-lucide-file-text" });
    createUrlLink(db, { category_id: a.id, title: "DPI", url: "https://dpi.example" });
    createFileLink(db, { category_id: b.id, title: "Protocole" }, file);
    createUrlLink(db, { category_id: a.id, title: "PACS", url: "https://pacs.example" });

    const catalog = listCatalog(db);
    expect(catalog.map((c) => c.name)).toEqual(["Outils", "Documents"]);
    expect(catalog[0]?.links.map((l) => l.title)).toEqual(["DPI", "PACS"]);
    expect(catalog[0]?.links.map((l) => l.position)).toEqual([0, 1]);
    expect(catalog[1]?.links[0]).toMatchObject({ kind: "file", file_name: "a.pdf", url: null });
    // stored_name never leaves the server
    expect(catalog[1]?.links[0]).not.toHaveProperty("stored_name");
  });

  it("reorders by the given id sequence", () => {
    const db = openDb(":memory:");
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const b = createCategory(db, { name: "B", icon: "i-lucide-folder" });
    reorderCategories(db, [b.id, a.id]);
    expect(listCatalog(db).map((c) => c.name)).toEqual(["B", "A"]);

    const l1 = createUrlLink(db, { category_id: a.id, title: "1", url: "https://x.example" });
    const l2 = createUrlLink(db, { category_id: a.id, title: "2", url: "https://y.example" });
    reorderLinks(db, [l2.id, l1.id]);
    expect(listCatalog(db)[1]?.links.map((l) => l.title)).toEqual(["2", "1"]);
  });

  it("moves a link to another category at the end and keeps its kind", () => {
    const db = openDb(":memory:");
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const b = createCategory(db, { name: "B", icon: "i-lucide-folder" });
    createUrlLink(db, { category_id: b.id, title: "first", url: "https://x.example" });
    const f = createFileLink(db, { category_id: a.id, title: "doc" }, file);
    const moved = updateLink(db, f.id, { category_id: b.id, title: "doc2", url: "https://nope" });
    expect(moved).toMatchObject({ category_id: b.id, title: "doc2", kind: "file", url: null });
    expect(moved?.position).toBe(1);
    expect(getStoredFile(db, f.id)?.stored_name).toBe("x.pdf");
  });

  it("deleting reports the files to unlink and cascades", () => {
    const db = openDb(":memory:");
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const f = createFileLink(db, { category_id: a.id, title: "doc" }, file);
    const u = createUrlLink(db, { category_id: a.id, title: "app", url: "https://x.example" });
    expect(deleteLink(db, u.id)).toEqual([]);
    expect(deleteLink(db, 999)).toBeUndefined();
    const w = createUrlLink(db, { category_id: a.id, title: "app2", url: "https://y.example" });
    setLinkIcon(db, w.id, { stored_name: "i.png", mime: "image/png" });
    expect(deleteCategory(db, a.id)).toEqual(["x.pdf", "i.png"]);
    expect(deleteCategory(db, a.id)).toBeUndefined();
    expect(getStoredFile(db, f.id)).toBeUndefined();
    expect(listCatalog(db)).toEqual([]);
  });

  it("stores the logo as a singleton, versions it and hides the stored name", () => {
    const db = openDb(":memory:");
    expect(getSiteSettings(db)).toEqual({ logo_version: null });
    expect(getLogo(db)).toBeUndefined();

    expect(setLogo(db, { stored_name: "a.png", mime: "image/png" })).toBeNull();
    const first = getSiteSettings(db).logo_version;
    expect(first).toMatch(/^\d/);
    expect(getSiteSettings(db)).not.toHaveProperty("stored_name");
    expect(getLogo(db)).toEqual({ stored_name: "a.png", mime: "image/png" });

    // replacing hands back the old file to unlink and bumps the version
    expect(setLogo(db, { stored_name: "b.svg", mime: "image/svg+xml" })).toBe("a.png");
    expect(getLogo(db)?.stored_name).toBe("b.svg");
    expect(getSiteSettings(db).logo_version).not.toBeNull();

    expect(setLogo(db, null)).toBe("b.svg");
    expect(getLogo(db)).toBeUndefined();
    expect(getSiteSettings(db)).toEqual({ logo_version: null });
  });

  it("gives a url link its own icon, versioned, and hands back the old file", () => {
    const db = openDb(":memory:");
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const u = createUrlLink(db, { category_id: a.id, title: "app", url: "https://x.example" });
    expect(u.icon_version).toBeNull();
    expect(setLinkIcon(db, 999, null)).toBeUndefined();

    expect(setLinkIcon(db, u.id, { stored_name: "a.ico", mime: "image/x-icon" })).toBeNull();
    expect(getLink(db, u.id)?.icon_version).toMatch(/^\d/);
    expect(getLink(db, u.id)).not.toHaveProperty("icon_stored_name");
    expect(getLinkIcon(db, u.id)).toEqual({ stored_name: "a.ico", mime: "image/x-icon" });

    expect(setLinkIcon(db, u.id, { stored_name: "b.png", mime: "image/png" })).toBe("a.ico");
    expect(deleteLink(db, u.id)).toEqual(["b.png"]);
  });
});
