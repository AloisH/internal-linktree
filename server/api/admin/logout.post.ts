export default defineEventHandler((event) => {
  deleteCookie(event, ADMIN_COOKIE, { path: "/" });
  return { ok: true };
});
