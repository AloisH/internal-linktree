import { z } from "zod";

const loginSchema = z.object({ password: z.string().min(1).max(256) });

// ponytail: in-memory per-IP counter — resets on restart, single process only.
// Move it into the SQLite file the day this runs as more than one instance.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;
const attempts = new Map<string, { n: number; until: number }>();

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  const now = Date.now();
  const hit = attempts.get(ip);
  if (hit && hit.until > now && hit.n >= MAX_ATTEMPTS) {
    throw createError({ statusCode: 429, statusMessage: "Too many attempts" });
  }

  const { password } = await readValidatedBody(event, loginSchema.parse);
  const token = useRuntimeConfig(event).adminToken;
  if (!safeEqual(password, token)) {
    const current = hit && hit.until > now ? hit : { n: 0, until: now + WINDOW_MS };
    attempts.set(ip, { n: current.n + 1, until: current.until });
    throw createError({ statusCode: 401, statusMessage: "Wrong password" });
  }

  attempts.delete(ip);
  setCookie(event, ADMIN_COOKIE, sessionValue(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: !import.meta.dev,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { ok: true };
});
