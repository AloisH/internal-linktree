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
    public: {
      // NUXT_PUBLIC_SITE_URL
      siteUrl: "http://localhost:3000",
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "fr" },
      titleTemplate: "%s · internal-linktree",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
      link: [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
    },
  },

  nitro: {
    // node:sqlite is newer than the builtin list rollup ships with.
    rollupConfig: { external: ["node:sqlite"] },
  },

  routeRules: {
    // Nothing on the public page depends on a request — render it once at build.
    "/": { prerender: true },
  },
});
