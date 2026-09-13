import { describe, expect, it } from "vitest";
import { AUDIENCES, audienceTag, canManageLink, isAudience } from "./audience";
import { ROLES } from "./roles";

describe("audience", () => {
  it("is perso, tous or one of the roles", () => {
    expect(AUDIENCES).toEqual(["perso", "tous", ...ROLES]);
    expect(isAudience("radiologue")).toBe(true);
    expect(isAudience("dentiste")).toBe(false);
    expect(audienceTag("tous")).toBe("");
    expect(audienceTag("perso")).toBe("Personnel");
    expect(audienceTag("secretaire")).toBe("Secrétaires");
  });

  it("lets the owner and the admins manage a link, nobody else", () => {
    const link = { owner_id: "u1" };
    expect(canManageLink(link, { id: "u1", role: "secretaire" })).toBe(true);
    expect(canManageLink(link, { id: "u2", role: "secretaire" })).toBe(false);
    expect(canManageLink(link, { id: "u2", role: "admin" })).toBe(true);
    expect(canManageLink({ owner_id: null }, { id: "u1", role: "radiologue" })).toBe(false);
    expect(canManageLink({ owner_id: null }, { id: "u1", role: "admin" })).toBe(true);
  });
});
