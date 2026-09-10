// Client-side navigation to /admin never hits server/middleware/admin.ts, so ask
// the API whether the session cookie is still good. SSR loads are already
// redirected server-side.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return;
  try {
    await $fetch("/api/admin/session");
  } catch {
    return navigateTo("/admin/login");
  }
});
