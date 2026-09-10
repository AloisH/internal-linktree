// Everything under /admin (pages) and /api/admin (routes) needs the session
// cookie, except the login endpoints. Adding an admin route = putting it under
// the prefix; nothing else to remember.
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  const isApi = path.startsWith("/api/admin/");
  const isPage = path === "/admin" || path.startsWith("/admin/");
  if (!isApi && !isPage) return;
  if (path === "/api/admin/login" || path === "/admin/login") return;
  if (isAdmin(event)) return;
  if (isApi) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  return sendRedirect(event, "/admin/login", 302);
});
