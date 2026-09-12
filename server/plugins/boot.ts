// Fail loud at boot, not on the first request: a usable auth secret and a
// migrated database are preconditions, the same way charpente validates its
// env before binding the port. Then make sure someone can log in.
export default defineNitroPlugin(async () => {
  if (import.meta.prerender) return;
  const { authSecret, adminEmail, adminPassword } = useRuntimeConfig();
  if (authSecret.length < 32) {
    throw new Error("NUXT_AUTH_SECRET must be set to 32+ characters — see .env.example");
  }
  const db = useDb();
  if (!adminEmail && !adminPassword) return;
  if (!adminEmail || adminPassword.length < 12) {
    throw new Error("NUXT_ADMIN_EMAIL and NUXT_ADMIN_PASSWORD (12+ characters) go together");
  }
  const created = await seedAdmin(useAuth(), db, {
    email: adminEmail,
    password: adminPassword,
    name: "Administrateur",
  });
  if (created) console.warn(`[auth] first admin account created: ${adminEmail}`);
});
