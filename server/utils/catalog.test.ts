import { describe, expect, it } from "vitest";
import {
  createCategory,
  createFileLink,
  createUrlLink,
  deleteCategory,
  deleteLink,
  getStoredFile,
  listCatalog,
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
    expect(deleteLink(db, u.id)).toBeNull();
    expect(deleteLink(db, 999)).toBeUndefined();
    expect(deleteCategory(db, a.id)).toEqual(["x.pdf"]);
    expect(deleteCategory(db, a.id)).toBeUndefined();
    expect(getStoredFile(db, f.id)).toBeUndefined();
    expect(listCatalog(db)).toEqual([]);
  });
});
