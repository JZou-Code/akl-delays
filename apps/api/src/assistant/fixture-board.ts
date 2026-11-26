import { readFile } from 'node:fs/promises';
import { DEFAULT_GTFS_DIR, loadConfig } from '../config/index.ts';
import { toServiceDelay } from '../delays/index.ts';
import {
  FIXTURE_FEED_PATH,
  FixtureFeedSource,
  dropStale,
  feedTimestamp,
  toTripDelays,
} from '../feed/index.ts';
import { loadGtfs } from '../gtfs/index.ts';
import type { BoardView } from './tools.ts';

// The recorded fixture as the tools see it, for the tests and the check script.
export async function loadFixtureBoard(now: Date): Promise<BoardView> {
  const readText = (path: string) => readFile(path, 'utf8');
  const gtfs = await loadGtfs(DEFAULT_GTFS_DIR, readText);
  const source = new FixtureFeedSource({ path: FIXTURE_FEED_PATH, readText, now: () => now });
  const feed = await source.fetchFeed();
  const feedTime = feedTimestamp(feed);
  const trips = dropStale(toTripDelays(feed), feedTime, loadConfig({}).maxUpdateAgeSeconds);
  return {
    snapshot: {
      feedTimestamp: feedTime,
      fetchedAt: now.toISOString(),
      services: trips.map((trip) => toServiceDelay(trip, gtfs)),
    },
    stale: false,
    feedSource: 'fixture',
  };
}
