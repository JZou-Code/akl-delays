# akl-delays

Shows how late Auckland's buses, trains and ferries are running right now. A Node.js API polls Auckland Transport's realtime feed, and a React page shows the result.

This is Ji Zou's personal project. It belongs to no employer. Do not copy code, config, docs or conventions from a work repository into it, and do not use work accounts, tokens or package registries here.

## Commands

Node version is in `.nvmrc`. Run everything from the repo root.

| Task | Command |
|------|---------|
| Install | `npm install` |
| Run API and web together | `npm run dev` |
| All tests | `npm test` |
| Tests for one workspace | `npm test -w apps/api` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |

The API runs on fixture data unless `FEED_SOURCE=at` and `AT_API_KEY` are set. See `.env.example`.

## Layout

```
packages/shared   types shared by the API and the web app (the HTTP contract)
apps/api          Node.js + Express
  src/config      environment variables, read and checked once
  src/feed        Auckland Transport client, feed schema, fixture source
  src/gtfs        static timetable lookups (routes, stops)
  src/delays      pure functions: status, joins, summaries
  src/store       the latest snapshot
  src/poller      polling loop and the weekly call budget
  src/http        Express app and routes
apps/web          React + Vite
docs              architecture, AT API notes, decisions, roadmap
```

## Rules

- TypeScript everywhere, `strict` on. No `any`.
- A module exposes its public surface through its `index.ts`. Other modules import from there and nowhere deeper.
- `delays/` is pure. No I/O and no clock: pass `now` in.
- Outside data (the feed, GTFS files, env vars) is parsed with zod where it enters. Code past that point trusts the types.
- Every module has unit tests next to the source, named `*.test.ts` or `*.test.tsx`. A feature is not done without them.
- No comments on code that reads plainly. Write a comment only for a constraint the code cannot show, such as a quirk of the AT feed. One line.
- One commit holds one small feature or one fix, with its tests. Subject in the imperative, lower case, under 70 characters. Add a body only when the reason is not obvious from the diff.
- Tick the item in `docs/roadmap.md` in the commit that finishes it.
- Never commit `.env` or an AT key.

## Writing

This applies to the README, docs, commit messages and UI text.

- Short plain sentences. Each one states a fact.
- No sales words: robust, seamless, powerful, leverage, comprehensive, cutting-edge.
- No emoji. No bold for emphasis in running text.
- Say what is not built or not checked. Do not describe plans as if they exist.

## Docs

- [Architecture](docs/architecture.md): modules, data flow, the HTTP contract
- [AT API notes](docs/at-api.md): endpoints, limits, what is still unconfirmed
- [Decisions](docs/decisions.md): choices made and why
- [Roadmap](docs/roadmap.md): what is done and what comes next, one commit per item

Skills in `.claude/skills/`:

- `connect-live-feed`: switch from fixtures to the real AT feed once a key exists
- `add-feature`: where a new piece of work goes and how to land it
