import { describe, expect, it } from "vitest";
import { MIGRATIONS, migrate, openDb } from "./db";

describe("db", () => {
  it("migrates a fresh database to the latest version and is idempotent", () => {
    const db = openDb(":memory:");
    const version = () =>
      (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    expect(version()).toBe(MIGRATIONS.length);
    expect(migrate(db)).toBe(MIGRATIONS.length);
    expect(version()).toBe(MIGRATIONS.length);
  });

  it("enforces foreign keys so links cannot outlive their category", () => {
    const db = openDb(":memory:");
    expect(() =>
      db.prepare("INSERT INTO links (category_id, kind, title) VALUES (?, 'url', 'x')").run(42),
    ).toThrow(/FOREIGN KEY/);
  });
});
