import { describe, expect, it } from "vitest";
import { createAuth } from "./auth";
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
  listSharedCatalog,
  setLinkIcon,
  setLogo,
  reorderCategories,
  reorderLinks,
  reorderLinksFor,
  updateLink,
} from "./catalog";
import { openDb } from "./db";

const file = {
  file_name: "a.pdf",
  stored_name: "x.pdf",
  file_mime: "application/pdf",
  file_size: 3,
};

// Links belong to accounts, so every test starts with three of them.
async function setup() {
  const db = openDb(":memory:");
  const auth = createAuth(db, {
    secret: "test-secret-test-secret-test-secret-42",
    baseURL: "http://localhost:3000",
  });
  async function user(name: string, role: "admin" | "radiologue" | "secretaire") {
    const created = await auth.api.createUser({
      body: { name, email: `${name}@example.com`, password: "correct-horse-battery", role },
    });
    return { id: created.user.id, role };
  }
  return {
    db,
    admin: await user("admin", "admin"),
    marie: await user("marie", "radiologue"),
    paul: await user("paul", "secretaire"),
  };
}

const url = (category_id: number, title: string, audience: Audience = "tous") => ({
  category_id,
  title,
  url: `https://${title.toLowerCase()}.example`,
  audience,
});

describe("catalog", () => {
  it("creates categories and links in insertion order, grouped, with their owner", async () => {
    const { db, admin, marie } = await setup();
    const a = createCategory(db, { name: "Outils", icon: "i-lucide-folder" });
    const b = createCategory(db, { name: "Documents", icon: "i-lucide-file-text" });
    createUrlLink(db, url(a.id, "DPI"), admin.id);
    createFileLink(db, { category_id: b.id, title: "Protocole", audience: "tous" }, file, marie.id);
    createUrlLink(db, url(a.id, "PACS"), admin.id);

    const catalog = listCatalog(db, marie);
    expect(catalog.map((c) => c.name)).toEqual(["Outils", "Documents"]);
    expect(catalog[0]?.links.map((l) => l.title)).toEqual(["DPI", "PACS"]);
    expect(catalog[0]?.links.map((l) => l.position)).toEqual([0, 1]);
    expect(catalog[0]?.links[0]).toMatchObject({ owner_id: admin.id, owner_name: "admin" });
    expect(catalog[1]?.links[0]).toMatchObject({ kind: "file", file_name: "a.pdf", url: null });
    // stored_name never leaves the server
    expect(catalog[1]?.links[0]).not.toHaveProperty("stored_name");
  });

  it("shows each user their own links, their role's and everyone's; the admin every shared one", async () => {
    const { db, admin, marie, paul } = await setup();
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    createUrlLink(db, url(a.id, "Tous"), admin.id);
    createUrlLink(db, url(a.id, "Radios", "radiologue"), admin.id);
    createUrlLink(db, url(a.id, "Secret", "secretaire"), paul.id);
    createUrlLink(db, url(a.id, "MariePerso", "perso"), marie.id);
    createUrlLink(db, url(a.id, "PaulPerso", "perso"), paul.id);

    const titles = (viewer: { id: string; role: string }) =>
      listCatalog(db, viewer)[0]?.links.map((l) => l.title);
    expect(titles(marie)).toEqual(["Tous", "Radios", "MariePerso"]);
    expect(titles(paul)).toEqual(["Tous", "Secret", "PaulPerso"]);
    expect(titles(admin)).toEqual(["Tous", "Radios", "Secret"]);
    expect(listSharedCatalog(db)[0]?.links.map((l) => l.title)).toEqual([
      "Tous",
      "Radios",
      "Secret",
    ]);
  });

  it("reorders by the given id sequence", async () => {
    const { db, admin } = await setup();
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const b = createCategory(db, { name: "B", icon: "i-lucide-folder" });
    reorderCategories(db, [b.id, a.id]);
    expect(listSharedCatalog(db).map((c) => c.name)).toEqual(["B", "A"]);

    const l1 = createUrlLink(db, url(a.id, "1"), admin.id);
    const l2 = createUrlLink(db, url(a.id, "2"), admin.id);
    reorderLinks(db, [l2.id, l1.id]);
    expect(listSharedCatalog(db)[1]?.links.map((l) => l.title)).toEqual(["2", "1"]);
  });

  it("keeps a personal order per user, new links after it, and forgets it with the user", async () => {
    const { db, admin, marie, paul } = await setup();
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const l1 = createUrlLink(db, url(a.id, "1"), admin.id);
    const l2 = createUrlLink(db, url(a.id, "2"), admin.id);
    const l3 = createUrlLink(db, url(a.id, "3"), admin.id);
    const titles = (viewer: { id: string; role: string }) =>
      listCatalog(db, viewer)[0]?.links.map((l) => l.title);

    reorderLinksFor(db, marie.id, [l3.id, l1.id, l2.id, 999]);
    expect(titles(marie)).toEqual(["3", "1", "2"]);
    expect(titles(paul)).toEqual(["1", "2", "3"]);
    // dragging again overwrites, the default order is untouched
    reorderLinksFor(db, marie.id, [l2.id, l3.id, l1.id]);
    expect(titles(marie)).toEqual(["2", "3", "1"]);
    expect(listSharedCatalog(db)[0]?.links.map((l) => l.title)).toEqual(["1", "2", "3"]);
    // a link nobody ordered yet comes after the ordered ones
    createUrlLink(db, url(a.id, "4"), admin.id);
    expect(titles(marie)).toEqual(["2", "3", "1", "4"]);

    deleteLink(db, l2.id);
    expect(titles(marie)).toEqual(["3", "1", "4"]);
    db.prepare('DELETE FROM "user" WHERE id = ?').run(marie.id);
    expect(db.prepare("SELECT COUNT(*) AS n FROM link_positions").get()).toEqual({ n: 0 });
  });

  it("a deleted account leaves its shared links behind, ownerless", async () => {
    const { db, marie } = await setup();
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const l = createUrlLink(db, url(a.id, "App"), marie.id);
    db.prepare('DELETE FROM "user" WHERE id = ?').run(marie.id);
    expect(getLink(db, l.id)).toMatchObject({ owner_id: null, owner_name: null });
  });

  it("moves a link to another category at the end and keeps its kind", async () => {
    const { db, admin } = await setup();
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const b = createCategory(db, { name: "B", icon: "i-lucide-folder" });
    createUrlLink(db, url(b.id, "first"), admin.id);
    const f = createFileLink(
      db,
      { category_id: a.id, title: "doc", audience: "tous" },
      file,
      admin.id,
    );
    const moved = updateLink(db, f.id, {
      category_id: b.id,
      title: "doc2",
      url: "https://nope",
      audience: "perso",
    });
    expect(moved).toMatchObject({
      category_id: b.id,
      title: "doc2",
      kind: "file",
      url: null,
      audience: "perso",
    });
    expect(moved?.position).toBe(1);
    expect(getStoredFile(db, f.id)?.stored_name).toBe("x.pdf");
  });

  it("deleting reports the files to unlink and cascades", async () => {
    const { db, admin } = await setup();
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const f = createFileLink(
      db,
      { category_id: a.id, title: "doc", audience: "tous" },
      file,
      admin.id,
    );
    const u = createUrlLink(db, url(a.id, "app"), admin.id);
    expect(deleteLink(db, u.id)).toEqual([]);
    expect(deleteLink(db, 999)).toBeUndefined();
    const w = createUrlLink(db, url(a.id, "app2"), admin.id);
    setLinkIcon(db, w.id, { stored_name: "i.png", mime: "image/png" });
    expect(deleteCategory(db, a.id)).toEqual(["x.pdf", "i.png"]);
    expect(deleteCategory(db, a.id)).toBeUndefined();
    expect(getStoredFile(db, f.id)).toBeUndefined();
    expect(listSharedCatalog(db)).toEqual([]);
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

  it("gives a url link its own icon, versioned, and hands back the old file", async () => {
    const { db, admin } = await setup();
    const a = createCategory(db, { name: "A", icon: "i-lucide-folder" });
    const u = createUrlLink(db, url(a.id, "app"), admin.id);
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
