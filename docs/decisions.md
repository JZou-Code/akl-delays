# Decisions

Newest first. Each entry says what was chosen and why.

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
