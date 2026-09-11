import { describe, expect, it } from "vitest";
import { LOGO_RULES, checkUpload, cleanFileName, storedName } from "./files";

describe("files", () => {
  it("accepts allow-listed extensions and rejects the rest", () => {
    expect(checkUpload({ filename: "Protocole.PDF", size: 10 })).toEqual({
      ext: "pdf",
      mime: "application/pdf",
    });
    expect(checkUpload({ filename: "run.exe", size: 10 })).toMatch(/non autorisé/);
    expect(checkUpload({ filename: "noext", size: 10 })).toMatch(/non autorisé/);
    expect(checkUpload({ filename: "a.pdf", size: 0 })).toMatch(/vide/);
    expect(checkUpload({ filename: "a.pdf", size: 26 * 1024 * 1024 })).toMatch(/volumineux/);
  });

  it("restricts the logo to small images", () => {
    expect(checkUpload({ filename: "logo.SVG", size: 10 }, LOGO_RULES)).toEqual({
      ext: "svg",
      mime: "image/svg+xml",
    });
    expect(checkUpload({ filename: "logo.pdf", size: 10 }, LOGO_RULES)).toMatch(/non autorisé/);
    expect(checkUpload({ filename: "logo.png", size: 3 * 1024 * 1024 }, LOGO_RULES)).toMatch(
      /2 Mo/,
    );
  });

  it("stores under a random name and keeps a clean display name", () => {
    expect(storedName("pdf")).toMatch(/^[0-9a-f]{32}\.pdf$/);
    expect(cleanFileName("../../etc/passwd")).toBe("passwd");
    expect(cleanFileName('C:\\x\\"quoted".pdf')).toBe("quoted.pdf");
    expect(cleanFileName("   ")).toBe("fichier");
  });
});
