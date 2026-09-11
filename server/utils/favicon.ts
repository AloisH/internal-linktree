import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { ICON_EXTENSIONS, MAX_ICON_SIZE } from "../../shared/utils/schemas";

/* eslint-disable no-await-in-loop -- hops, candidates and chunks are sequential by design */
// Fetches a site's favicon on the admin's behalf. The server does the
// request, so it must not be usable to probe the VPS's own network: only
// http(s), public addresses, manual redirects, short timeout, capped size.

const TIMEOUT_MS = 5000;
const MAX_HTML = 512 * 1024;
const MAX_HOPS = 3;

/** Extension for an image mime we accept as an icon, or undefined. */
function extForMime(mime: string): string | undefined {
  if (mime === "image/vnd.microsoft.icon") return "ico";
  return Object.keys(ICON_EXTENSIONS).find((ext) => ICON_EXTENSIONS[ext] === mime);
}

/** Private, loopback, link-local and other non-routable addresses. */
export function isPublicAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const [a = 0, b = 0] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false; // link-local, cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    return true;
  }
  if (kind === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === "::1" || v6 === "::") return false;
    if (v6.startsWith("fe80:") || v6.startsWith("fc") || v6.startsWith("fd")) return false;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
    return mapped ? isPublicAddress(mapped[1] as string) : true;
  }
  return false;
}

/** Icon candidates declared in the HTML head, best first, then the classic fallback. */
export function iconCandidates(html: string, pageUrl: string): string[] {
  const head = html.slice(0, MAX_HTML);
  const found: { href: string; score: number }[] = [];
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = /\brel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    const href = /\bhref\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1];
    if (!href) continue;
    const rels = rel.split(/\s+/);
    if (rels.includes("apple-touch-icon") || rels.includes("apple-touch-icon-precomposed")) {
      found.push({ href, score: 2 });
    } else if (rels.includes("icon")) {
      const size = Number(/\bsizes\s*=\s*["']?(\d+)/i.exec(tag)?.[1] ?? 0);
      found.push({ href, score: size >= 32 ? 1 : 0 });
    }
  }
  found.sort((a, b) => b.score - a.score);
  const urls: string[] = [];
  for (const { href } of [...found, { href: "/favicon.ico", score: -1 }]) {
    try {
      const abs = new URL(href, pageUrl).href;
      if (!urls.includes(abs)) urls.push(abs);
    } catch {
      // unparsable href — skip
    }
  }
  return urls;
}

async function assertPublic(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("scheme");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("local host");
  }
  const ip = isIP(host) ? host : (await lookup(host)).address;
  if (!isPublicAddress(ip)) throw new Error("private address");
}

interface Fetched {
  data: Uint8Array;
  mime: string;
}

/**
 * GET with manual redirects (each hop checked) and a byte cap: a body over
 * the cap is truncated (HTML — the head is at the top) or rejected (images).
 */
async function safeFetch(
  start: string,
  maxBytes: number,
  truncate = false,
): Promise<Fetched | undefined> {
  let url = new URL(start);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "internal-linktree/1 (favicon)", accept: "*/*" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return undefined;
      url = new URL(location, url);
      continue;
    }
    if (!res.ok || !res.body) return undefined;
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > maxBytes && !truncate) return undefined;
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        if (!truncate) return undefined;
        chunks.push(value.subarray(0, value.byteLength - (size - maxBytes)));
        break;
      }
      chunks.push(value);
    }
    const mime = (res.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    return { data: Buffer.concat(chunks), mime };
  }
  return undefined;
}

export interface FetchedIcon {
  data: Uint8Array;
  mime: string;
  ext: string;
}

/**
 * Best icon for a page, or undefined when none can be fetched. Never throws
 * for network reasons — an unreachable site simply has no icon.
 */
export async function fetchFavicon(pageUrl: string): Promise<FetchedIcon | undefined> {
  let candidates: string[];
  try {
    const page = await safeFetch(pageUrl, MAX_HTML, true);
    const html =
      page && page.mime.startsWith("text/html") ? Buffer.from(page.data).toString("utf8") : "";
    candidates = iconCandidates(html, pageUrl);
  } catch {
    return undefined;
  }
  for (const candidate of candidates) {
    try {
      const icon = await safeFetch(candidate, MAX_ICON_SIZE);
      if (!icon || icon.data.byteLength === 0) continue;
      const mime = icon.mime === "image/vnd.microsoft.icon" ? "image/x-icon" : icon.mime;
      const ext = extForMime(mime) ?? guessExt(candidate);
      if (!ext) continue;
      return { data: icon.data, mime: ICON_EXTENSIONS[ext] as string, ext };
    } catch {
      // next candidate
    }
  }
  return undefined;
}

/** For servers that send a generic content-type: trust a known extension in the URL. */
function guessExt(url: string): string | undefined {
  const ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
  return ext && ext in ICON_EXTENSIONS ? ext : undefined;
}
