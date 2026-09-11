import { createReadStream, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { H3Event } from "h3";
import type { StoredImage } from "./catalog";

// Streams a stored image (logo, link icon). Referenced with ?v=<version> the
// URL changes on every upload, so a versioned response is cached hard.
export function sendStoredImage(event: H3Event, image: StoredImage | undefined): unknown {
  const path = image && join(uploadsDir(), image.stored_name);
  if (!image || !path || !existsSync(path)) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
  const versioned = typeof getQuery(event).v === "string";
  setHeaders(event, {
    "content-type": image.mime,
    "content-length": statSync(path).size,
    "cache-control": versioned ? "public, max-age=31536000, immutable" : "no-cache",
    "x-content-type-options": "nosniff",
    // An SVG opened directly must not run scripts; as <img> it never does.
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
  });
  return sendStream(event, createReadStream(path));
}
