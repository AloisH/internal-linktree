import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";

export const ADMIN_COOKIE = "admin_session";

/**
 * What the cookie holds: a derivation of the token, never the token itself.
 * Stateless — rotating NUXT_ADMIN_TOKEN logs every browser out.
 */
export function sessionValue(token: string): string {
  return createHmac("sha256", token).update("admin-session").digest("hex");
}

/** Constant-time string compare; both sides are hashed so lengths never leak or throw. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isAdmin(event: H3Event): boolean {
  const cookie = getCookie(event, ADMIN_COOKIE);
  const token = useRuntimeConfig(event).adminToken;
  return Boolean(cookie) && Boolean(token) && safeEqual(cookie as string, sessionValue(token));
}
