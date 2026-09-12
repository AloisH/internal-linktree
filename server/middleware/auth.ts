// Every page and API route needs a session; /admin (pages) and /api/admin
// (routes) also need the admin role. Adding a route = putting it under the
// right prefix, nothing else to remember. Better Auth's own endpoints guard
// themselves: the admin plugin checks the role, OAuth client management goes
// through `clientPrivileges`.
const PUBLIC_API = ["/api/auth/", "/api/health", "/api/site", "/api/logo"];

function isPublic(path: string): boolean {
  return PUBLIC_API.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p));
}

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const path = url.pathname;
  const isApi = path.startsWith("/api/");
  const isAdmin = path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin/");
  const isPage = path === "/" || path === "/consent" || (isAdmin && !isApi);
  if (!isApi && !isPage) return;
  if (isPublic(path)) return;

  const session = await useAuth().api.getSession({ headers: event.headers });
  if (!session) {
    if (isApi) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    const redirect = encodeURIComponent(path + url.search);
    return sendRedirect(event, `/login?redirect=${redirect}`, 302);
  }
  if (isAdmin && session.user.role !== "admin") {
    if (isApi) throw createError({ statusCode: 403, statusMessage: "Forbidden" });
    return sendRedirect(event, "/", 302);
  }
});
