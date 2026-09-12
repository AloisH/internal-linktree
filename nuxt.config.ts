// One Nuxt app: the portal behind a login, /admin for the admin role, Better Auth as
// the clinic's OIDC provider, SQLite via node:sqlite.
export default defineNuxtConfig({
  compatibilityDate: "2026-08-01",
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    // NUXT_AUTH_SECRET — signs sessions and tokens (32+ chars). Checked at boot.
    authSecret: "",
    // NUXT_ADMIN_EMAIL / NUXT_ADMIN_PASSWORD — first admin, created at boot when
    // the user table is empty (server/plugins/boot.ts). Ignored afterwards.
    adminEmail: "",
    adminPassword: "",
    // NUXT_DB_PATH — SQLite file, created on first boot.
    dbPath: "./data/app.db",
    // NUXT_UPLOADS_DIR — where uploaded files live (same volume as the DB in Docker).
    uploadsDir: "./data/uploads",
    public: {
      // NUXT_PUBLIC_SITE_URL — also the Better Auth base URL / OIDC issuer prefix.
      siteUrl: "http://localhost:3000",
      // NUXT_PUBLIC_SIGNUP_EMAIL_DOMAIN — lets people register with an address
      // ending in this domain (role "utilisateur"). Empty: no self sign-up.
      signupEmailDomain: "",
      // NUXT_PUBLIC_INSECURE_REDIRECT_HOSTS — comma-separated hosts/IPs of an
      // internal network without TLS, allowed as http:// redirect targets for
      // declared applications. Tokens travel in clear there. Empty: https only.
      insecureRedirectHosts: "",
      // NUXT_PUBLIC_SITE_NAME — shown in the header and the browser tab.
      siteName: "Portail interne",
      // NUXT_PUBLIC_SITE_TAGLINE
      siteTagline: "Applications et documents de l’établissement, au même endroit.",
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "fr" },
      titleTemplate: "%s · Portail interne",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
      link: [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
    },
  },

  nitro: {
    // node:sqlite is newer than the builtin list rollup ships with.
    rollupConfig: { external: ["node:sqlite"] },
  },
});
