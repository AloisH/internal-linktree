import { describe, expect, it } from "vitest";
import { safeEqual, sessionValue } from "./admin";

describe("admin", () => {
  it("safeEqual compares exactly, whatever the lengths", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("secret", "secret!")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });

  it("sessionValue is stable, token-bound and never the token itself", () => {
    expect(sessionValue("tok")).toBe(sessionValue("tok"));
    expect(sessionValue("tok")).not.toBe(sessionValue("tok2"));
    expect(sessionValue("tok")).not.toContain("tok");
  });
});
