import { createReadStream, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// Public: the organisation logo, referenced with ?v=<logo_version> so it can
// be cached hard — a new upload changes the URL.
export default defineEventHandler((event) => {
  const logo = getLogo(useDb());
  const path = logo && join(uploadsDir(), logo.stored_name);
  if (!logo || !path || !existsSync(path)) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
  const versioned = typeof getQuery(event).v === "string";
  setHeaders(event, {
    "content-type": logo.mime,
    "content-length": statSync(path).size,
    "cache-control": versioned ? "public, max-age=31536000, immutable" : "no-cache",
    "x-content-type-options": "nosniff",
    // An SVG opened directly must not run scripts; as <img> it never does.
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
  });
  return sendStream(event, createReadStream(path));
});
