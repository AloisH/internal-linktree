// Fail loud at boot, not on the first request: a usable admin token and a
// migrated database are preconditions, the same way charpente validates its
// env before binding the port. Prerendering "/" at build time needs neither.
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return;
  const { adminToken } = useRuntimeConfig();
  if (adminToken.length < 12) {
    throw new Error("NUXT_ADMIN_TOKEN must be set to 12+ characters — see .env.example");
  }
  useDb();
});
