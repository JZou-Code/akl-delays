# Auckland Transport API notes

The public pages of https://dev-portal.at.govt.nz were read on 20 November 2026. The first requests with a key were made on 24 November 2026. Each item says which.

## Confirmed

From the public pages:

- Sign-up is free. A subscription key comes from the Products page. The product that holds the realtime feed is "Realtime Compat".
- The key goes in the `Ocp-Apim-Subscription-Key` header. A `subscription-key` query parameter also works and is read only when the header is missing.
- The response is JSON by default. `Accept: application/x-protobuf` returns protobuf.
- The feed changes at least every 30 seconds.
- Every response is the full feed. There are no incremental updates.
- Limits: 600 calls a minute and 35,000 calls a week.

From requests on 24 November 2026:

- Four paths answer 200 under `https://api.at.govt.nz/realtime/legacy`: `/` for the combined feed, `/tripupdates`, `/vehiclelocations` and `/servicealerts`.
- The JSON wrapper is `{ "status": "OK", "response": { "header": {...}, "entity": [...] }, "error": null }`.
- `header.timestamp` has milliseconds, such as `1795470709.552`. `gtfs_realtime_version` is `"1.0"`.
- `stop_time_update` is one object, not a list. It is the stop the vehicle last reported at.
- Enums are numbers. On a trip, `schedule_relationship` 0 is scheduled, 1 is added and 3 is cancelled.
- Every trip update has `delay` and `timestamp`.
- `vehicle` has `id`, `label` and, for buses, `license_plate`. The project does not read the plate.

## What the real feed does

Seen in two trip update responses on 24 November 2026, at 10:51 and 14:54 NZDT. Each held about 1,700 trips.

- A trip stays in the feed long after its last update. More than half were over ten minutes old and the oldest was almost six hours old. See the 20-minute rule in [the decisions](decisions.md).
- A cancelled trip has no `stop_time_update` and no `vehicle`. The first response had none and the second had four.
- A `vehicle` can have an empty `id`. One Te Huia train did.
- Some `route_id` values are not in `routes.txt`. All seven in the second response were school buses, such as `S094-217`. The board shows them with the route id and no mode.
- A fresh update can still carry a delay that looks wrong. One Te Huia train showed 17,606 seconds late on an update under 20 minutes old. The project shows it as it comes.
- No trip in either response was without a `delay`.

Over 3 hours 25 minutes with one call a minute, 202 polls worked and one failed, when AT did not answer within 10 seconds. The next poll worked.

## Not confirmed

- The filter parameters. Expected: `tripid` and `vehicleid`, comma-separated. The project does not use them.
- How long AT keeps a cancelled trip in the feed.
- Whether AT's own on-time measure matches the thresholds in `docs/architecture.md`. About a third of buses count as early under the 60-second rule, which suggests the rule is too strict.
- Whether the terms page shows more text to a signed-in user. See below.

## Terms of use

Read on 24 November 2026, signed out.

- AT's data sources page, https://at.govt.nz/about-us/at-data-sources/, says the data is under the Creative Commons Attribution 4.0 International licence and is free to use by developers, researchers and open data enthusiasts.
- CC BY 4.0 allows copying, keeping and publishing the data and figures made from it, with credit to AT.
- The terms page of the developer portal shows three sentences of introduction to a signed-out reader and nothing about storage.
- Clause 8.6 of the website terms says AT does not promise the data is accurate.

So the project may keep history and publish statistics, and it credits AT in the README. This is a reading of public pages, not legal advice.

## Call budget

One call a minute is 10,080 calls a week. One call every 30 seconds is 20,160. Two endpoints every 30 seconds is 40,320, which is over the limit.

The poller calls one endpoint every 60 seconds by default. `poller/` works out the weekly total from the interval and refuses to start when it is over 35,000.

## Static timetable

Route names, the kind of vehicle and stop names are not in the realtime feed. They come from AT's GTFS zip, linked from https://at.govt.nz/about-us/at-data-sources/general-transit-feed-specification/. The project reads `routes.txt` and `stops.txt` from it.

`route_type` in `routes.txt` gives the mode: 2 is rail, 3 is bus, 4 is ferry.

The zip is at https://gtfs.at.govt.nz/gtfs.zip and needs no key. On 24 November 2026 it was 32 MB and held 13 files. `routes.txt` had 218 routes: 197 bus, 17 ferry and 4 rail. `stop_times.txt` is 114 MB unpacked and the project does not read it.

`npm run gtfs:download -w apps/api` writes `routes.txt` and `stops.txt` to `apps/api/data/gtfs`, which git ignores. Set `GTFS_DIR=data/gtfs` to use them. The route and stop ids in the realtime feed carry a version suffix, such as `32-203`, that changes with the timetable, so download again when lookups start to miss. `feed_info.txt` in the zip gives the dates the timetable covers.

## The fixtures

`apps/api/fixtures/tripupdates.json` is cut from the response recorded on 24 November 2026 at 14:54 NZDT. It holds 23 of the 1,663 trips. Licence plates are removed. Nothing else is changed.

It has early, on-time, late and very late buses, four trains, two ferries, two cancelled trips, a school bus that `routes.txt` does not list, a vehicle with an empty id and three trips old enough for the 20-minute rule to drop. It has no late train and no trip without a delay, because the response had none.

`apps/api/fixtures/gtfs` holds the rows of the real `routes.txt` and `stops.txt` that those trips use.

To record again, follow the `connect-live-feed` skill.
