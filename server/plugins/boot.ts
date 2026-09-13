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
  // Nuxt parses env values: a numeric password would arrive as a number.
  const email = String(adminEmail ?? "").trim();
  const password = String(adminPassword ?? "");
  if (!email && !password) return;
  if (!email || password.length < 12) {
    throw new Error("NUXT_ADMIN_EMAIL and NUXT_ADMIN_PASSWORD (12+ characters) go together");
  }
  const created = await seedAdmin(useAuth(), db, { email, password, name: "Administrateur" });
  if (created) console.warn(`[auth] first admin account created: ${email}`);
});
