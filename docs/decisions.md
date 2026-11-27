# Decisions

Newest first. Each entry says what was chosen and why.

## 2026-11-27: departures come from the timetable moved by the live delay

A rider wants to know when the next 70 reaches their stop. The feed cannot say: it gives one stop for each trip, the last one it reported at. So the project loads AT's timetable and works the time out. The scheduled time at the rider's stop is the scheduled time at the reported stop plus the timetable's gap between the two. The expected time adds the trip's current delay.

Checked on a saved feed from 24 November 2026: for 865 of 872 fresh trips, the feed's time at the reported stop minus its delay was the timetable's time for that stop to the second. The other 7 were one second off.

Not checked: how close the expected time is to when the bus really comes. That needs feeds saved over time, which is the history work in the roadmap.

The timetable is kept in memory, not in a database. It is 114 MB as a file and about 90 MB of heap once loaded, and it loads in under a second. The project has no database yet. When history goes into PostgreSQL the timetable can go with it.

A trip that ends at the stop is not listed. A third of the trips in a fresh feed sit at their last stop, already finished, so listing them would fill a terminus with services nobody can board.

## 2026-11-27: the board still counts trips that have finished

Found while building departures and not fixed. A trip stays in the feed for some minutes after it reaches its last stop. On the saved feed, 323 of 872 fresh trips were at their last stop. The board and the summary count them as running. The timetable now says which stop is a trip's last, so they could be left out. That changes every count on the board, so it is left for its own change.

## 2026-11-27: route and stop are two filters

The board had one box that matched a route name or a stop name. It could not answer "the 70 at Panmure", because one text cannot name both. The board now has a Route box and a Stop box, and `GET /api/delays` takes `route` and `stop`. Every filter that is set has to match.

`route` matches the start of the route name, so typing 7 then 0 narrows the list as it goes and 70 does not bring in 170 or 670. It does bring in 70A. `stop` matches anywhere in the stop name, because riders know a stop by a word in the middle of its name, such as Panmure in "Stop B Panmure Station".

The limit: the feed gives one stop for each running service, the one it reports now. The filter finds the services at that stop now. It does not find the services that will call there later. That needs the timetable in `stop_times.txt`, which the project does not load.

`q` stays in the API for a search over both names. The page no longer sends it.

## 2026-11-27: a school bus gets its name from its route id

AT's `routes.txt` leaves out school buses. On a school afternoon about 250 of 1,300 running services had no route name and no mode, so the board showed them as "Unknown" and the mode counts left them out. Their route ids all look like `S050B-203`. A route id of that shape that is not in `routes.txt` is now read as the bus `S050B`. For every route that is in `routes.txt`, the name is the id without its last part, which is why the same rule is used here. Any other id that is not in the file still has no name and no mode.

Not checked: that every id of this shape is a school bus. It held for the 251 ids seen on 27 November 2026.

## 2026-11-27: the tools count, the model does not

`list_delays` and `get_route` return `byStatus`, a count of every match by status, next to a list of at most 20 services. The first version returned only the list. Asked about a route with 22 running services, the model counted the 20 it was given and said six were late, then named five.

## 2026-11-27: the cheapest model answers the questions

`claude-haiku-5-5` is the default and `ASSISTANT_MODEL` changes it. The questions are lookups over three tools, not reasoning. At list price a question of a few thousand tokens costs under a tenth of a US cent on this model. `claude-opus-5-5` costs 40 times as much for each token.

Checked on 27 November 2026: `npm run ask:check -w apps/api` sent twelve fixed questions on the recorded sample and all twelve passed. The run used 59,061 input tokens and 2,736 output tokens. Eight other questions were asked by hand on the live feed and read against the board. Not checked: any wider set of questions.

## 2026-11-27: the tools only read, and questions are limited by the hour

Route and stop names come from AT and reach the model inside tool results. Text in a name could try to steer the model. Every tool reads the snapshot and none can change anything, so the worst result is a wrong answer.

A tool result holds at most 20 services. One question cannot pull the whole snapshot of about 900 services into the prompt.

The API answers at most 20 questions an hour. The count is in memory. It stops a bug in the page or a test from running up a bill. It is not enough for a public site: a restart clears it, and one visitor can use up the hour for everyone. A public deployment needs a daily limit and a spend limit set in the Anthropic Console as well.

## 2026-11-27: a hand-written tool loop

The Anthropic SDK has a tool runner that does this loop, but it is in beta. The loop here is about 40 lines in `assistant/loop.ts`. It takes a fake model in tests, records each tool call for the page to show, and stops after 5 model calls.

The loop sends each reply back to the model whole. A reply holds thinking blocks next to the tool calls, and the API needs them returned as they came.

Thinking cannot be turned off on the current models. The loop always sends `effort: 'low'`. It sets `max_tokens` to 16,000 because thinking counts against that limit, and the prompt keeps the answer short. A model call has 30 seconds and one retry. The SDK's defaults are 10 minutes and two retries.

## 2026-11-24: a cancelled trip is not dropped for its age

AT sends one update for a cancelled trip, at the moment it is cancelled. It has no stop and no vehicle. One response, recorded on 24 November 2026 at 14:54 NZDT, had four cancelled trips. Their updates were 26 to 53 minutes old, so the 20-minute rule dropped all of them. A trip cancelled half an hour before it was due would leave the board before its departure time.

Cancelled trips are now kept whatever their age. AT removes them from the feed itself: the four in that response were due to start 30 to 54 minutes before it. How long AT keeps them is not known.

## 2026-11-24: one colour list for both themes, and a theme select

Each colour in `styles.css` is written once as `light-dark(light, dark)`. The browser picks a side from `color-scheme`. The page follows the system setting until the reader picks Light or Dark in the header. The pick sets `data-theme` on `<html>`, which pins `color-scheme`, and is kept in `localStorage`. Picking System removes both.

A short inline script in `index.html` sets `data-theme` before the first paint. Without it a saved theme would show the other one for a moment while the module script loads.

The select has three options and not a two-state switch. A switch needs to know the system setting to show its state, which means reading `matchMedia` and listening for changes. The select only shows the saved choice.

The dark page background is `#1b1e23` with panels at `#23272e`, not near-black. Text is `#e2e5e9`, not white. The status colours in dark mode are less saturated than in light mode.

`light-dark()` works in Chrome 123, Firefox 120 and Safari 17.5 or later. Older browsers are not handled.

## 2026-11-24: board layout

On a screen 62rem or wider the summary sits in a column on the left and stays in view while the services scroll. Below that the two stack. The table header sticks to the top of the window. The table uses separate borders because a sticky cell loses a collapsed border.

The delay column is text such as "5 min late", so it is not right-aligned. The counts in the summary are numbers and are right-aligned.

On a phone the table keeps all five columns and long stop names wrap. It was checked at 320px and 375px in headless Chrome and did not scroll sideways. It was not checked on a real phone.

## 2026-11-24: fflate to unpack the GTFS zip

Node has no zip reader. fflate has no dependencies and can unpack chosen files from a zip held in memory. The script takes `routes.txt` and `stops.txt` and leaves the rest packed, so the 114 MB `stop_times.txt` is never inflated. Calling the `unzip` program would work on macOS and Linux only and could not be tested with a fake.

## 2026-11-24: leave out trip updates older than 20 minutes

The AT feed keeps a trip long after its last update. One response, recorded on 24 November 2026 at 10:51 NZDT, had 1817 trip updates. 1108 of them were more than ten minutes old and the oldest was almost six hours old. The old ones carry the last delay AT worked out, and some are wrong by hours: the lowest was 27023 seconds early. Sorted worst first, they would fill the top of the board.

A trip is left out when its last update is more than 20 minutes older than the feed's header time. In that response this kept 890 trips, with delays from 1119 seconds early to 1165 seconds late. A limit of 30 minutes let in a delay of 4910 seconds.

The cost: AT sends an update when a vehicle reaches a stop, so a trip with a long gap between stops looks old while it is still running. At 20 minutes, 58 of the dropped trips still had a vehicle in the vehicle positions feed taken a few seconds later. At 10 minutes it was 99.

Age is measured against the feed's header time and not the clock. A recorded feed then gives the same result on any day, and the fixture feed keeps working.

These numbers come from one off-peak response. The limit is the `MAX_UPDATE_AGE_SECONDS` variable so it can change when there is more data. A better rule would drop a trip once it has passed its last stop. That needs `stop_times.txt`, which the project does not read yet.

## 2026-11-20: react-router for the two views

The page has two views: the board and one route. react-router gives the route parameter, the query string and links without hand-written history code. The board keeps its mode and status filters in the query, so a filtered view can be shared and reloaded.

## 2026-11-20: fixtures first, live feed later

The AT account could not sign in on the day the project started. The feed source sits behind an interface, and a fixture source is the default. Everything except the HTTP call to AT can be built and tested now.

## 2026-11-20: the API serves a snapshot

Browsers never cause a call to AT. One poller fetches on a timer and the HTTP routes read what it stored. The weekly limit of 35,000 calls then depends on one number, the poll interval.

## 2026-11-20: keep the snapshot in memory

The first version answers "how late are things now". That needs only the latest feed. A database comes when the project starts keeping history, and the store has an interface so it can be swapped.

## 2026-11-20: one repository, npm workspaces

The API and the web app share the response types in `packages/shared`. A change to a response shows up as a type error on the other side. npm workspaces do this with no extra tool.

## 2026-11-20: no build step for the API yet

The API runs through `tsx` and is checked with `tsc --noEmit`. Deployment is not in scope, so a compiled build would have no user.

## 2026-11-20: Express, zod, Vitest

Express because it is small and widely known. zod to check the feed and env vars where they enter. Vitest because it runs the API tests and the React tests with one tool.
