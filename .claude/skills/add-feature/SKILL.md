---
name: add-feature
description: Where a new piece of work goes in akl-delays and how to land it as small commits. Use before starting any roadmap item or any new feature or fix in this repository.
---

# Add a feature

## 1. Find its place

| The work is about | It goes in |
|-------------------|------------|
| A new field or route in the API response | `packages/shared` first, then `apps/api/src/http`, then `apps/web/src/api` |
| Reading something new from the AT feed | `apps/api/src/feed` (schema, then parsing) |
| Route or stop information | `apps/api/src/gtfs` |
| A rule or a calculation | `apps/api/src/delays`, as a pure function |
| When or how often data is fetched | `apps/api/src/poller` |
| Something on the page | `apps/web/src/features/<name>` |

A module's `index.ts` is its public surface. Export the new thing there if another module needs it.

## 2. Split it

One commit is one behaviour. A response field that goes from the feed to the page is usually four commits: schema, calculation, route, page. Add the lines to `docs/roadmap.md` before you start if the work is not there yet.

## 3. Write it

- Write the test next to the source, then the code.
- Pass in anything that touches the outside: `fetch`, the clock, timers, the file system. Tests use fakes, not the network.
- Parse outside data with zod where it enters.
- No comments on plain code.

## 4. Check it

```
npm test
npm run typecheck
npm run lint
```

All three pass before every commit.

## 5. Commit it

- Stage files by name.
- Subject in the imperative, lower case, under 70 characters: `add status filter to the board`.
- Tick the roadmap line in the same commit.
- If the work settled a choice someone could question later, add an entry at the top of `docs/decisions.md`.
- If it changed a module's job or the HTTP contract, update `docs/architecture.md` in the same commit.
