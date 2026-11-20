import { toServiceDelay } from '../delays/index.ts';
import { feedTimestamp, toTripDelays, type FeedSource } from '../feed/index.ts';
import type { Gtfs } from '../gtfs/index.ts';
import type { Store } from '../store/index.ts';
import { checkCallBudget } from './budget.ts';

export type Schedule = (callback: () => Promise<void>, delayMs: number) => () => void;

export interface PollerOptions {
  source: FeedSource;
  gtfs: Gtfs;
  store: Store;
  intervalSeconds: number;
  now: () => Date;
  schedule: Schedule;
  log: (line: string) => void;
}

export interface Poller {
  start: () => Promise<void>;
  stop: () => void;
}

function oneLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').trim();
}

export function createPoller(options: PollerOptions): Poller {
  const { source, gtfs, store, intervalSeconds, now, schedule, log } = options;
  checkCallBudget(intervalSeconds);
  let running = false;
  let cancelNext: (() => void) | null = null;

  async function pollOnce(): Promise<void> {
    try {
      const feed = await source.fetchFeed();
      const services = toTripDelays(feed).map((trip) => toServiceDelay(trip, gtfs));
      const snapshot = { feedTimestamp: feedTimestamp(feed), fetchedAt: now().toISOString() };
      store.set({ ...snapshot, services });
      log(`poll ok: ${services.length} services, feed time ${snapshot.feedTimestamp}`);
    } catch (error) {
      log(`poll failed: ${oneLine(error)}`);
    }
  }

  async function tick(): Promise<void> {
    cancelNext = null;
    await pollOnce();
    if (running) cancelNext = schedule(tick, intervalSeconds * 1000);
  }

  return {
    start: () => {
      if (running) return Promise.resolve();
      running = true;
      return tick();
    },
    stop: () => {
      running = false;
      cancelNext?.();
      cancelNext = null;
    },
  };
}
