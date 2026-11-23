# Architecture

## Data flow

```
AT realtime feed ──> feed ──┐
                            ├──> delays ──> store ──> http ──> web
GTFS routes and stops ─> gtfs ─┘
                poller drives the left side on a timer
```

1. The poller asks a feed source for the current feed.
2. `feed` checks the response against a schema and turns it into trip delays. It leaves out a trip whose last update is more than `MAX_UPDATE_AGE_SECONDS` older than the feed's own time. The default is 1200.
3. `delays` joins each trip with its route and stop from `gtfs`, gives it a status, and builds a summary per mode. A trip whose route is not in `routes.txt` has no mode, so the summary does not count it.
4. `store` keeps that snapshot in memory.
5. `http` serves the snapshot. It never calls AT itself.
6. The web app asks the API every 30 seconds.

A browser request therefore costs no AT call. The number of calls to AT depends only on the poll interval.

## API modules

Each folder under `apps/api/src` has an `index.ts`. Imports between modules go through it.

| Module | Does | Depends on |
|--------|------|------------|
| `config` | Reads env vars once and checks them | nothing |
| `feed` | `FeedSource` interface, the AT HTTP source, the fixture source, the feed schema, parsing into `TripDelay`, dropping stale trips | `config` types only |
| `gtfs` | Loads `routes.txt` and `stops.txt`, answers lookups by id. Downloads both from AT's GTFS zip | `shared` types |
| `delays` | Status from seconds, join with route and stop, summary per mode | `shared` types |
| `store` | Holds the latest snapshot and says whether it is stale: no successful fetch for more than three poll intervals | `shared` types |
| `poller` | Runs fetch, parse, join, store on a timer. Checks the weekly call budget | `feed`, `gtfs`, `delays`, `store` |
| `http` | Express app and routes | `store`, `delays` |

`compose.ts` builds the pieces from the config and passes them to each other. `main.ts` reads the env vars, calls it with the real `fetch`, clock, timer and file reads, then listens and starts the poller. No module creates its own dependencies, so tests pass in fakes: a fake `fetch`, a fake clock, a fake timer.

## Two feed sources

`FeedSource` has one method, `fetchFeed()`.

- `FixtureFeedSource` reads hand-written JSON from `apps/api/fixtures`. It is the default, so the project runs without a key.
- `AtFeedSource` calls the AT API. It is used when `FEED_SOURCE=at`.

## Status rules

`delaySeconds` is positive when the service is late.

| Status | Rule |
|--------|------|
| `cancelled` | the feed marks the trip cancelled |
| `unknown` | no delay value |
| `early` | more than 60 seconds early |
| `on_time` | from 60 seconds early to 5 minutes late |
| `late` | more than 5 and up to 15 minutes late |
| `very_late` | more than 15 minutes late |

The thresholds live in one file in `delays/`.

## HTTP contract

Types are in `packages/shared`. All times are ISO 8601 strings in UTC.

| Route | Returns |
|-------|---------|
| `GET /api/health` | `{ ok, feedSource, lastFetchedAt }` |
| `GET /api/summary` | counts per mode and status, feed time, `stale` flag |
| `GET /api/delays?mode=&status=&limit=` | services, worst delay first |
| `GET /api/routes/:routeId` | one route and its running services |

`ok` in the health response is true when a snapshot exists and is not stale. The health route answers 200 even before the first poll.

Worst delay first means the highest `delaySeconds` first. Services with no delay value, such as most cancelled trips, come last.

`mode` is `bus`, `train` or `ferry`. `status` takes the values in the table above. `limit` is a whole number above 0; without it every matching service is returned. An empty query value counts as not set. A bad query value gets a 400 with `{ error }`. An unknown route gets a 404. `http` reads only the snapshot, so a route with no service in the current feed also gets a 404, even when it is in `routes.txt`. Before the first successful poll, data routes return 503.

## Web app

```
src/api         one function per API route, and the context that holds fetch
src/hooks       usePolling, useNow
src/features    summary, board, route
src/components  small shared pieces and the text formatting
```

Components get data through hooks. They do not call `fetch` directly. The hooks take `fetch` from a React context, so tests pass in a fake one.

The page has two views: the board at `/` and one route at `/routes/:routeId`. Each route name on the board links to its route view. When the API answers 404 for a route, the route view says nothing is running on it and links back to the board.

The board keeps its filters in the page URL, as `?mode=` and `?status=` with the same values as the API query.

Each view asks the API again every 30 seconds and keeps the last good data when a request fails. A banner says so when that happens, and when the summary's `stale` flag is set. The 503 the API gives before its first poll is shown as waiting for the first data, not as an error.

In development the Vite server serves the page on port 5173 and sends `/api` requests to the API on `PORT`, read from the environment or the root `.env` like the API does. The page has no production build or server yet.

## Not built

- History. The snapshot is replaced on every poll and nothing is kept.
- A database.
- Deployment.
