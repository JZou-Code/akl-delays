# Auckland Transport API notes

Checked against the public pages of https://dev-portal.at.govt.nz on 20 November 2026. No request has been made with a key yet, so the items under "Not confirmed" come from third-party code and memory.

## Confirmed

- Sign-up is free. A subscription key comes from the Products page.
- The key goes in the `Ocp-Apim-Subscription-Key` header. A `subscription-key` query parameter also works and is read only when the header is missing.
- The response is JSON by default. `Accept: application/x-protobuf` returns protobuf.
- Field names are snake_case and follow the GTFS Realtime spec.
- The feed changes at least every 30 seconds.
- Every response is the full feed. There are no incremental updates.
- Limits: 600 calls a minute and 35,000 calls a week.
- `speed` and `odometer` are not provided. `bearing` appears only when the vehicle reports it.
- `https://api.at.govt.nz/realtime/legacy/vehiclelocations` exists. It is listed in the Mobility Database.

## Not confirmed

- The other paths. Expected: `/realtime/legacy/` for the combined feed, `/realtime/legacy/tripupdates`, `/realtime/legacy/servicealerts`.
- The filter parameters. Expected: `tripid` and `vehicleid`, comma-separated.
- The JSON wrapper. Expected: `{ "status": "OK", "response": { "header": {...}, "entity": [...] } }`.
- Whether `stop_time_update` is one object or an array. The GTFS spec says array. The schema in `apps/api/src/feed` accepts both.
- The terms of use on storing the data and publishing figures from it. Read them before anything is kept or put on a public site.
- Whether AT's own on-time measure matches the thresholds in `docs/architecture.md`.

## Call budget

One call a minute is 10,080 calls a week. One call every 30 seconds is 20,160. Two endpoints every 30 seconds is 40,320, which is over the limit.

The poller calls one endpoint every 60 seconds by default. `poller/` works out the weekly total from the interval and refuses to start when it is over 35,000.

## Static timetable

Route names, the kind of vehicle and stop names are not in the realtime feed. They come from AT's GTFS zip, linked from https://at.govt.nz/about-us/at-data-sources/general-transit-feed-specification/. The project reads `routes.txt` and `stops.txt` from it.

`route_type` in `routes.txt` gives the mode: 2 is rail, 3 is bus, 4 is ferry.

## The fixtures

The files in `apps/api/fixtures` are hand-written to the shape above. They are not recordings. Replace them with real responses when a key exists. The `connect-live-feed` skill has the steps.
