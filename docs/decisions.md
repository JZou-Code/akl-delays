# Decisions

Newest first. Each entry says what was chosen and why.

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
