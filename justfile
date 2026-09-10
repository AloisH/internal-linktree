# internal-linktree — single entry point for every command.
# `just` with no args lists the recipes.

set dotenv-load := true

default:
    @just --list

# One-time machine setup (also installs the lefthook git hooks)
setup:
    pnpm install

# ── Dev ──────────────────────────────────────────────────────────

# Nuxt dev server on http://localhost:3000 (SQLite file created on first boot)
dev:
    pnpm dev

# Production build + local run of the built output
preview: build
    node .output/server/index.mjs

build:
    pnpm build

# ── Quality ──────────────────────────────────────────────────────

fmt:
    pnpm exec oxfmt .

lint:
    pnpm exec oxfmt --check .
    pnpm exec oxlint --deny-warnings
    pnpm typecheck
    pnpm exec knip

test:
    pnpm test

# ── Release ──────────────────────────────────────────────────────

# just release patch | minor | major — tags vX.Y.Z, CI builds + pushes the image
release bump:
    ./scripts/release.sh {{bump}}

# Pull + restart the prod stack on the current host (run on the server)
deploy:
    docker compose pull && docker compose up -d
