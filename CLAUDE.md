# Agent guide

Internal link portal for a radiology clinic, and its identity provider. One
Nuxt 4 app: the portal (`app/pages/index.vue`, behind a login) lists categories
of links — each link is either an app (url) or an uploaded file, belongs to
whoever created it and has an audience (`shared/utils/audience.ts`: `perso`,
`tous` or a role) — anyone signed in adds links from the portal and orders
their own tiles; the admin (`app/pages/admin/`, `server/api/admin/`) manages
categories, the default order of shared links, accounts and the applications
allowed to sign users in. Better Auth (`server/utils/auth.ts`)
holds the accounts, gives every user one role (`shared/utils/roles.ts`) and
acts as an OpenID Connect provider for the clinic's other apps
(`/api/auth/oauth2/*`, role in the `role` claim). SQLite through `node:sqlite`
(`server/utils/db.ts`), uploads on disk (`server/utils/files.ts`,
`NUXT_UPLOADS_DIR`). Nuxt UI for components, zod for validation. Generated from
cabane — same tooling, none of the infrastructure.

## Commands

```sh
just dev       # nuxt dev on :3000, creates data/app.db on first boot
just lint      # oxfmt --check + oxlint + nuxt typecheck + knip — run before committing
just test      # vitest (server utils, pure node)
just build     # nuxt build → .output/
just release patch|minor|major
```

Needs `.env` (copy `.env.example`); boot refuses to start without a 32+ char
`NUXT_AUTH_SECRET`. `NUXT_ADMIN_EMAIL` + `NUXT_ADMIN_PASSWORD` create the first
admin while the user table is empty; other accounts come from `/admin/users`
or, for addresses ending in `NUXT_PUBLIC_SIGNUP_EMAIL_DOMAIN`, from `/signup`
(role `utilisateur`, checked in a Better Auth `hooks.before`).

## Hard rules

- **Schema changes are appended** to `MIGRATIONS` in `server/utils/db.ts`.
  Never edit or reorder a past entry — `PRAGMA user_version` tracks what ran.
  Better Auth's tables are frozen there too (v5): after a Better Auth upgrade or
  a plugin change, `server/utils/auth.test.ts` tells what is missing — append
  the `ALTER`/`CREATE` it needs, never run its own migrator.
- **Everything needs a session, `/admin` needs the admin role.**
  `server/middleware/auth.ts` guards pages and `/api/*` (public: `/api/auth/*`,
  `/api/health`, `/api/site`, `/api/logo`) and leaves the user on
  `event.context.user` (`requireUser`); `app/middleware/auth.global.ts`
  repeats the check on client-side navigation. Admin routes live under
  `/api/admin/`, admin pages under `/admin/`; do not add per-route checks.
- **Links are per row, not per route.** `/api/links/*` is open to every
  session; a link is edited or deleted by its owner or an admin only
  (`canManageLink`, enforced by `requireManagedLink`). `/api/catalog` returns
  what the viewer may see (`listCatalog(db, viewer)`), `/api/admin/catalog`
  every shared link; `/api/links/reorder` sets the viewer's own order
  (`link_positions`), `/api/admin/links/reorder` the default one.
- **Accounts go through Better Auth**, never through hand-written SQL on its
  tables. Server side `useAuth().api.*`, browser side `authClient.*`
  (`app/utils/auth-client.ts`). Roles are the `ROLES` tuple and the matching
  access controller in `shared/utils/access.ts` — add a role in both.
- **`@better-auth/utils` is pinned** in `package.json` only so pnpm resolves a
  single `@better-auth/core`; two copies break the plugin types. Bump it with
  Better Auth, to the version its `peerDependencies` name.
- **Request bodies go through `readValidatedBody(event, schema.parse)`** with a
  zod schema. Schemas shared with a form live in `shared/utils/` (auto-imported
  on both sides); row types in `shared/types/`. The one multipart route
  (`server/api/links.post.ts`) parses fields by hand, then `safeParse`.
- **SQL lives in `server/utils/catalog.ts`**, pure functions taking the
  `DatabaseSync`. Route handlers validate, call one of them, set the status.
- **`stored_name` never leaves the server.** Public rows come from
  `LINK_COLUMNS`; the download route (`/api/files/[id]`) is the only reader.
- **Deleting a link or category unlinks its files** (`removeUpload`) — the row
  is the source of truth, the file on disk is disposable.
- **Server utils that need runtime values from `shared/utils/`** import them
  with a relative path: vitest runs without Nuxt auto-imports (types are fine).
- No new dependency for what Nuxt, Nuxt UI, zod or the Node stdlib already do.
- User-facing text is French, inline. No i18n layer unless the site goes
  bilingual — then `@nuxtjs/i18n` like charpente.
- Conventional commits (commitlint enforces this).

## Tests

- Vitest, colocated `*.test.ts` under `server/` and `shared/`. Server utils are
  pure modules (`node:sqlite`, `node:crypto`) — test them with `openDb(":memory:")`,
  no Nuxt environment needed. Links need an owner: create accounts with
  `createAuth(db, …).api.createUser`, as `catalog.test.ts` does.
- CI also builds the Docker image and probes `/api/health` and the 401 on
  `/api/admin/categories`.
