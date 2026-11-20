# Roadmap

One line is one commit. Tick the line in the commit that finishes it. Work top to bottom: later items depend on earlier ones.

## 1. Workspace

- [x] Root `package.json` with npm workspaces, shared `tsconfig.base.json`, scripts for `test`, `typecheck`, `lint`
- [x] ESLint and Prettier
- [x] `packages/shared`: `Mode`, `DelayStatus`, `ServiceDelay`, `ModeSummary`, `Summary`, `RouteDetail`, `Health`

## 2. API

- [x] `apps/api` workspace with Vitest and one passing test
- [x] `config`: read and check `PORT`, `FEED_SOURCE`, `AT_API_KEY`, `POLL_INTERVAL_SECONDS`, `GTFS_DIR`; `.env.example`
- [x] `delays`: status from delay seconds
- [x] `feed`: schema for the feed wrapper and header
- [x] `feed`: schema for trip updates, with `stop_time_update` as object or array
- [x] `feed`: turn trip updates into `TripDelay`
- [x] `feed`: fixture files and `FixtureFeedSource`
- [x] `feed`: `AtFeedSource` with an injected `fetch`; errors for 401, 429 and bad JSON
- [x] `gtfs`: load `routes.txt`, look up a route, map `route_type` to a mode
- [x] `gtfs`: load `stops.txt`, look up a stop
- [x] `delays`: join `TripDelay` with route and stop into `ServiceDelay`
- [x] `delays`: summary per mode
- [x] `delays`: filter and sort (mode, status, limit, worst first)
- [x] `store`: hold the latest snapshot, report `stale` after three missed polls
- [x] `poller`: weekly call count from the interval, refuse an interval over the limit
- [x] `poller`: poll loop with an injected timer; a failed poll keeps the last snapshot
- [x] `http`: Express app and `GET /api/health`
- [x] `http`: `GET /api/summary`, 503 before the first poll
- [x] `http`: `GET /api/delays` with query checks
- [x] `http`: `GET /api/routes/:routeId`
- [x] `main.ts`: build the pieces and start; `npm run dev -w apps/api`

## 3. Web

- [x] `apps/web` workspace: Vite, React, Vitest with Testing Library, one passing test
- [x] `api`: typed client for the four routes
- [x] `hooks`: `usePolling`, with loading, error and last-good data
- [x] `features/summary`: counts per mode
- [x] `features/board`: table of services, worst first
- [x] `features/board`: filter by mode and status
- [x] `features/route`: one route and its services
- [x] Stale and error banner
- [x] Vite dev proxy to the API and a root `npm run dev` that starts both

## 4. Live feed

Blocked until the AT account works. Follow the `connect-live-feed` skill.

- [ ] Record real responses and replace the hand-written fixtures
- [ ] Fix the schema where the real feed differs
- [ ] Script to download the GTFS zip and unpack `routes.txt` and `stops.txt`
- [ ] Read AT's terms of use and write down what they allow

## Later

Not planned in detail.

- Keep history in PostgreSQL and show punctuality by route and hour
- Vehicle positions on a map
- Service alerts next to the routes they affect
- Deployment
