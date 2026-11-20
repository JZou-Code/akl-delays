---
name: connect-live-feed
description: Switch akl-delays from fixture data to the real Auckland Transport feed. Use when an AT subscription key is available for the first time, or when the live feed stops parsing.
---

# Connect the live feed

The project was built before anyone had an AT key. The schema and fixtures follow the expected shape in `docs/at-api.md`, and parts of that shape are unconfirmed. This is the procedure for the first real request and for any later change in the feed.

## Before you start

- The key is in `.env` as `AT_API_KEY`. Never print it, commit it or put it in a fixture.
- Read the "Not confirmed" list in `docs/at-api.md`.

## Steps

1. Make one request for each expected path and save the raw body under `apps/api/data/` (git-ignored). Use the header `Ocp-Apim-Subscription-Key`. Wait at least a second between requests.
2. For a path that returns 404, look up the correct one in the portal's API reference while signed in. Fix the path in `feed/` and in `docs/at-api.md`.
3. Run the saved bodies through the feed schema. Write down every field that fails.
4. Fix the schema one difference at a time, one commit each, with a test that uses a cut-down piece of the real body.
5. Replace the files in `apps/api/fixtures`. Keep about twenty entities per file and include at least one late bus, one late train, one early service, one cancelled trip and one trip with no delay value. Remove vehicle licence plates.
6. Move each item you settled from "Not confirmed" to "Confirmed" in `docs/at-api.md`, with the date.
7. Start the API with `FEED_SOURCE=at` and leave it for ten minutes. Check `/api/health` and `/api/summary`, and that the log shows one call per interval.
8. Tick the items in section 4 of `docs/roadmap.md`.

## Limits

600 calls a minute and 35,000 a week. Do not loop over the API while exploring. Save a response once and work from the file.

## If the feed stops parsing later

Save the failing body, find the field with the schema error, and go to step 4.
