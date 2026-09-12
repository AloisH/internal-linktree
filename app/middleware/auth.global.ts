// Client-side navigation never hits server/middleware/auth.ts, so ask Better
// Auth whether the session is still good before rendering a guarded page.
// SSR loads are already redirected server-side.
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  const isAdmin = to.path === "/admin" || to.path.startsWith("/admin/");
  if (!isAdmin && to.path !== "/" && to.path !== "/consent") return;
  const { data } = await authClient.getSession();
  if (!data?.user) return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  if (isAdmin && data.user.role !== "admin") return navigateTo("/");
});
