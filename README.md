# akl-delays

How late are Auckland's buses, trains and ferries right now?

Auckland Transport publishes a realtime feed of its vehicles. This project polls that feed, works out how far each service is from its timetable, and shows it on one page.

## Status

Early. The API and the page run on hand-written sample data. The live feed is not connected. See [the roadmap](docs/roadmap.md).

The page shows the number of services per mode and status, a board of services with the worst delay first, and one route with its services. The board filters by mode and status. The page asks the API again every 30 seconds and says so when the data is out of date or a request fails.

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

Realtime data comes from Auckland Transport's developer portal, https://dev-portal.at.govt.nz.
