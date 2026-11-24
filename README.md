# akl-delays

How late are Auckland's buses, trains and ferries right now?

Auckland Transport publishes a realtime feed of its vehicles. This project polls that feed, works out how far each service is from its timetable, and shows it on one page.

## Status

Early. The API and the page run on a small recording of the real feed by default. With an AT key they run on the live feed. Nothing is deployed and no history is kept. See [the roadmap](docs/roadmap.md).

The page shows the number of services per mode and status, a board of services with the worst delay first, and one route with its services. The board searches by route or stop name, filters by mode and status, and sorts by any column. The page has a light and a dark theme. The page asks the API again every 30 seconds and says so when the data is out of date or a request fails.

## Run it

You need the Node version in `.nvmrc`.

```
npm install
npm run dev
```

The page is at http://localhost:5173 and the API at http://localhost:3000. The page's dev server sends `/api` requests to the API. To move the API, set `PORT` in `.env`; the dev server follows it.

## Tests

```
npm test
```

## How it works

The [architecture notes](docs/architecture.md) cover the modules and the data flow. The [AT API notes](docs/at-api.md) cover the feed and its call limits.

## Data

Realtime and timetable data come from [Auckland Transport](https://at.govt.nz/about-us/at-data-sources/) under the [Creative Commons Attribution 4.0 International licence](https://creativecommons.org/licenses/by/4.0/). The files in `apps/api/fixtures` are cut from that data, with licence plates removed.

To use the live feed, get a key from https://dev-portal.at.govt.nz, set `FEED_SOURCE=at` and `AT_API_KEY` in `.env`, and run `npm run gtfs:download -w apps/api` with `GTFS_DIR=data/gtfs`.
