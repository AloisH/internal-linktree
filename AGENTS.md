# Agent guide

One Nuxt 4 app: public page (`app/pages/index.vue`), admin behind a shared
secret (`app/pages/admin/`, `server/api/admin/`), SQLite through `node:sqlite`
(`server/utils/db.ts`). Nuxt UI for components, zod for validation. Little
sibling of charpente — same tooling, none of the infrastructure.

## Commands

```sh
just dev       # nuxt dev on :3000, creates data/app.db on first boot
just lint      # oxfmt --check + oxlint + nuxt typecheck + knip — run before committing
just test      # vitest (server utils, pure node)
just build     # nuxt build → .output/
just release patch|minor|major
```

Needs `.env` (copy `.env.example`); boot refuses to start without a 12+ char
`NUXT_ADMIN_TOKEN`.

## Hard rules

- **Schema changes are appended** to `MIGRATIONS` in `server/utils/db.ts`.
  Never edit or reorder a past entry — `PRAGMA user_version` tracks what ran.
- **Admin routes live under `/api/admin/`** and admin pages under `/admin/`.
  `server/middleware/admin.ts` guards both prefixes; do not add per-route checks
  and do not put admin things elsewhere.
- **Request bodies go through `readValidatedBody(event, schema.parse)`** with a
  zod schema. Schemas shared with a form live in `shared/utils/` (auto-imported
  on both sides); row types in `shared/types/`.
- No new dependency for what Nuxt, Nuxt UI, zod or the Node stdlib already do.
- User-facing text is French, inline. No i18n layer unless the site goes
  bilingual — then `@nuxtjs/i18n` like charpente.
- Conventional commits (commitlint enforces this).

## Tests

- Vitest, colocated `*.test.ts` under `server/` and `shared/`. Server utils are
  pure modules (`node:sqlite`, `node:crypto`) — test them with `openDb(":memory:")`,
  no Nuxt environment needed.
- CI also builds the Docker image and probes `/api/health` and the 401 on
  `/api/admin/messages`.
