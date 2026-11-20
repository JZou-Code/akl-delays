# akl-delays

How late are Auckland's buses, trains and ferries right now?

Auckland Transport publishes a realtime feed of its vehicles. This project polls that feed, works out how far each service is from its timetable, and shows it on one page.

## Status

Early. The API and the page run on recorded sample data. The live feed is not connected yet. See [the roadmap](docs/roadmap.md).

## Run it

You need the Node version in `.nvmrc`.

```
npm install
npm run dev
```

The page is at http://localhost:5173 and the API at http://localhost:3000.

## Tests

```
npm test
```

## How it works

The [architecture notes](docs/architecture.md) cover the modules and the data flow. The [AT API notes](docs/at-api.md) cover the feed and its call limits.

## Data

Realtime data comes from Auckland Transport's developer portal, https://dev-portal.at.govt.nz.
