# internal-linktree

The small sibling of [charpente](https://github.com/AloisH/charpente): one
Nuxt 4 page, an admin dashboard behind a shared secret, SQLite in a file —
with charpente's tooling (lint, format, typecheck, tests, CI, GHCR releases,
Copier template) and none of its infrastructure.

## Stack

| Layer   | Tech                                                             |
| ------- | ---------------------------------------------------------------- |
| App     | Nuxt 4 (SSR), Nuxt UI (Tailwind v4, forms, toasts, dark mode)    |
| Data    | SQLite via `node:sqlite` (stdlib, no native module), WAL         |
| Admin   | `/admin` — one password from `NUXT_ADMIN_TOKEN`, httpOnly cookie |
| Schemas | zod, shared between the form and the API route                   |
| Deploy  | One Docker image (GHCR) + docker compose + Caddy (auto-TLS)      |

## Start a new project

```sh
pipx install copier
copier copy --trust gh:AloisH/internal-linktree my-page
```

Later, pull starter improvements with `copier update`.

## Development

```sh
mise install              # pinned node / pnpm / just
cp .env.example .env      # then set NUXT_ADMIN_TOKEN
pnpm install
just dev                  # http://localhost:3000 — admin at /admin
```

## Everyday commands

```sh
just lint       # oxfmt + oxlint + nuxt typecheck + knip
just test       # vitest
just build      # nuxt build
just release patch   # tag → CI builds ghcr.io/<owner>/internal-linktree
just deploy     # on the server: compose pull && up -d
```

## Layout

```
app/pages/index.vue          the page (+ contact form)
app/pages/admin/             login + dashboard
server/api/messages.post.ts  public write
server/api/admin/            guarded by server/middleware/admin.ts
server/utils/db.ts           node:sqlite connection + MIGRATIONS array
shared/utils/schemas.ts      zod schemas used by both sides
```

## Deliberately left out

- **Real auth.** One admin, one password. Add Better Auth when a second person
  needs to log in.
- **An ORM.** Hand-written SQL against three tables is shorter than the setup.
  Drizzle when it stops being true.
- **i18n.** French inline. `@nuxtjs/i18n` when the site goes bilingual.
- **Rate limiting the contact form.** The login route has one; add the same
  Map to `messages.post.ts` the day spam shows up.
