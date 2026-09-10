import { defineConfig } from "vitest/config";

// Plain vitest: the server utils are pure node modules (node:sqlite, node:crypto),
// so no Nuxt test environment is needed.
export default defineConfig({
  test: {
    include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
  },
});
