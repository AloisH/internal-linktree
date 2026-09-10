## What

<!-- One or two sentences: what changes and why. -->

## Checklist

- [ ] `just lint && just test` pass locally
- [ ] Schema changed → a new entry appended to `MIGRATIONS` in `server/utils/db.ts` (never edit a past one)
- [ ] New `/api/admin/*` route → nothing to do, the server middleware guards the prefix
