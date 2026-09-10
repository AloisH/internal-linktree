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

  it("stores and reads back a message with a server-side timestamp", () => {
    const db = openDb(":memory:");
    db.prepare("INSERT INTO messages (name, email, body) VALUES (?, ?, ?)").run(
      "Ada",
      "ada@example.com",
      "Hi",
    );
    const row = db.prepare("SELECT name, email, body, created_at FROM messages").get() as Record<
      string,
      unknown
    >;
    expect(row).toMatchObject({ name: "Ada", email: "ada@example.com", body: "Hi" });
    expect(new Date(row.created_at as string).getTime()).not.toBeNaN();
  });
});
