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
import { toPositions } from '../poller/index.ts';
import { createStopBoard } from '../departures/index.ts';
import { departuresTool } from './departures-tool.ts';
import { BOARD_TOOLS, type AssistantTool, type BoardView } from './tools.ts';

export interface FixtureBoard extends BoardView {
  tools: readonly AssistantTool[];
}

// The recorded fixture as the tools see it, for the tests and the check script.
export async function loadFixtureBoard(now: Date): Promise<FixtureBoard> {
  const readText = (path: string) => readFile(path, 'utf8');
  const gtfs = await loadGtfs(DEFAULT_GTFS_DIR, readText);
  const source = new FixtureFeedSource({ path: FIXTURE_FEED_PATH, readText, now: () => now });
  const feed = await source.fetchFeed();
  const feedTime = feedTimestamp(feed);
  const trips = dropStale(toTripDelays(feed), feedTime, loadConfig({}).maxUpdateAgeSeconds);
  const stops = createStopBoard({ gtfs, now: () => now, includeScheduled: false });
  return {
    tools:
      stops === null ? BOARD_TOOLS : [...BOARD_TOOLS, departuresTool({ stops, now: () => now })],
    snapshot: {
      feedTimestamp: feedTime,
      fetchedAt: now.toISOString(),
      services: trips.map((trip) => toServiceDelay(trip, gtfs)),
      positions: toPositions(trips),
    },
    stale: false,
    feedSource: 'fixture',
  };
}
