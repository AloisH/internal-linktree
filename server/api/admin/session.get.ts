// Reaching this handler at all means server/middleware/admin.ts accepted the cookie.
export default defineEventHandler(() => ({ ok: true }));
