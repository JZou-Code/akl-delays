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
| `assistant` | Answers a question in plain English from the snapshot: three read-only tools, the loop that lets a Claude model call them, the hourly limit | `store`, `delays`, the Anthropic SDK |
| `http` | Express app and routes | `store`, `delays`, `assistant` |

`compose.ts` builds the pieces from the config and passes them to each other. `main.ts` reads the env vars, calls it with the real `fetch`, clock, timer and file reads, then listens and starts the poller. No module creates its own dependencies, so tests pass in fakes: a fake `fetch`, a fake clock, a fake timer.

## Two feed sources

`FeedSource` has one method, `fetchFeed()`.

- `FixtureFeedSource` reads a cut-down recording of the real feed from `apps/api/fixtures`. It is the default, so the project runs without a key.
- `AtFeedSource` calls the AT API. It is used when `FEED_SOURCE=at`.

## Asking a question

`POST /api/ask` takes a question and returns an answer that a Claude model wrote. It is off unless `ANTHROPIC_API_KEY` is set. [plan-ask.md](plan-ask.md) has the full design.

1. `http` checks the question, 1 to 300 characters.
2. `assistant` checks that a snapshot exists and that the hour has room for one more question. The default is 20 an hour, counted in memory.
3. The loop sends the question, a fixed system prompt and the three tools to the model. A note after the question says so when the data is stale. The page, not the model, says whether the data is live or a recording.
4. When the model asks for tools, the loop checks each input with zod, runs the tool on the snapshot, and sends every result back in one message. An unknown tool or a bad input goes back as an error, so the model can try again.
5. The loop stops when the model writes its answer, or after 5 model calls.

| Tool | Returns |
|------|---------|
| `get_summary` | counts per mode and status, whether the data is stale |
| `list_delays` | services filtered and sorted like `GET /api/delays`, at most 20, with a count of every match by status |
| `get_route` | the services on one route, found by the name a rider uses, at most 20, with a count by status |

The tools only read. A tool result holds route, mode, status, delay in whole minutes and stop name for each service, so the model never sees a trip id, a vehicle id or a route id.

Only `anthropic-client.ts` builds the SDK client. The loop depends on a `ModelClient` interface with one method, so the tests script the model's replies and call no API.

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
| `GET /api/health` | `{ ok, feedSource, lastFetchedAt, assistant }` |
| `GET /api/summary` | counts per mode and status, feed time, `stale` flag |
| `GET /api/delays?mode=&status=&route=&stop=&q=&sort=&order=&limit=` | `{ total, services }`, worst delay first |
| `GET /api/routes/:routeId` | one route and its running services |
| `POST /api/ask` with `{ question }` | `{ answer, steps, model, usage, feedSource, feedTimestamp }` |

`ok` in the health response is true when a snapshot exists and is not stale. The health route answers 200 even before the first poll.

Worst delay first means the highest `delaySeconds` first. Services with no delay value, such as most cancelled trips, come last.

`sort` is `route`, `mode`, `status`, `delay` or `stop`, and `order` is `asc` or `desc`. Without them the list is worst delay first, which is `sort=delay&order=desc`. Names sort with numbers in number order, so route 70 comes before route 101. Status sorts from early to unknown. A service with no value in the sort column comes last in both directions. Services equal in the sort column are worst delay first. The limit applies after the sort.

`mode` is `bus`, `train` or `ferry`. `status` takes the values in the table above. `q` is text of at most 50 characters. It keeps the services whose route name or stop name holds it, ignoring case. A route with no name is matched by its id. `route` keeps the services whose route name starts with it, and `stop` keeps the services whose stop name holds it, both ignoring case and both at most 50 characters. Every filter that is set has to match, so `route=70&stop=Panmure` gives the 70 services at a stop with Panmure in its name. The stop of a service is the one stop the feed reports for it now, not every stop on its trip. `limit` is a whole number above 0; without it every matching service is returned. `total` counts every match, so the page can say how many are left out by the limit. An empty query value counts as not set. A bad query value gets a 400 with `{ error }`. An unknown route gets a 404. `http` reads only the snapshot, so a route with no service in the current feed also gets a 404, even when it is in `routes.txt`. Before the first successful poll, data routes return 503.

`assistant` in the health response is true when the API has an Anthropic key. `POST /api/ask` answers 400 for a question that is missing, empty or over 300 characters, 429 when the hourly limit is reached, 502 when the model call fails or the loop runs out of calls, and 503 when no key is set or there is no snapshot yet. `steps` lists the tool calls the model made, each with its input and a short count of what came back. `usage` is the input and output tokens of all the model calls for the question.

## Web app

```
src/api         one function per API route, and the context that holds fetch
src/hooks       usePolling, useNow
src/features    summary, board, route, ask
src/components  small shared pieces and the text formatting
src/theme       the theme select and the saved choice
```

Components get data through hooks. They do not call `fetch` directly. The hooks take `fetch` from a React context, so tests pass in a fake one.

The page has two views: the board at `/` and one route at `/routes/:routeId`. Each route name on the board links to its route view. When the API answers 404 for a route, the route view says nothing is running on it and links back to the board.

The board keeps its filters in the page URL, as `?mode=`, `?status=` and `?q=` with the same values as the API query. The search box writes `?q=` once typing has stopped for 300 milliseconds. Each column heading of the board is a button that sorts by that column, and a second press turns the order around. The sort is in the URL as `?sort=` and `?order=`, left out when it is worst delay first. The board asks for 50 services, says how many match, and has a button that asks for 50 more. A new filter or sort goes back to 50. While a changed query loads, the board keeps showing the services it had.

The board asks the health route once. When `assistant` is true it shows a box for a question, with three example questions. Under the answer it lists the tool calls the model made, the model's name and the token counts. Each tool call is shown in plain words, such as "Looked at buses, most delayed first. Found 13 services.", not as the tool name and its input. A new question replaces the last answer. Nothing is kept.

Each view asks the API again every 30 seconds and keeps the last good data when a request fails. A banner says so when that happens, and when the summary's `stale` flag is set. The 503 the API gives before its first poll is shown as waiting for the first data, not as an error.

In development the Vite server serves the page on port 5173 and sends `/api` requests to the API on `PORT`, read from the environment or the root `.env` like the API does. The page has no production build or server yet.

## Not built

- History. The snapshot is replaced on every poll and nothing is kept.
- A database.
- Deployment.
