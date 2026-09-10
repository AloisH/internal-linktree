# Contributing

## Setup

```sh
mise install
cp .env.example .env   # set NUXT_ADMIN_TOKEN
pnpm install           # also installs the lefthook git hooks
just dev
```

## Before pushing

`just lint && just test`. The pre-commit hook runs oxfmt/oxlint on staged
files; commit messages must be conventional commits (commitlint).

## Changing the schema

Append an SQL string to `MIGRATIONS` in `server/utils/db.ts`. It runs at the
next boot, inside a transaction, on every database that is behind.

## Releases

`just release patch` tags `vX.Y.Z`; the tag triggers the GHCR build and a
GitHub Release with the changelog. Deployment stays manual (`just deploy` on
the server).
