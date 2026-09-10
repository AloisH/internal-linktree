// One Nuxt app: the public page, /admin behind a shared secret, SQLite via node:sqlite.
export default defineNuxtConfig({
  compatibilityDate: "2026-08-01",
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    // NUXT_ADMIN_TOKEN — the /admin password. Checked at boot (server/plugins/boot.ts).
    adminToken: "",
    // NUXT_DB_PATH — SQLite file, created on first boot.
    dbPath: "./data/app.db",
    // NUXT_UPLOADS_DIR — where uploaded files live (same volume as the DB in Docker).
    uploadsDir: "./data/uploads",
    public: {
      // NUXT_PUBLIC_SITE_URL
      siteUrl: "http://localhost:3000",
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
