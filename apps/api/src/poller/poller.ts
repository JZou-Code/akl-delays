import { toServiceDelay } from '../delays/index.ts';
import { dropStale, feedTimestamp, toTripDelays, type FeedSource } from '../feed/index.ts';
import type { Gtfs } from '../gtfs/index.ts';
import type { Store } from '../store/index.ts';
import { checkCallBudget } from './budget.ts';

export type Schedule = (callback: () => Promise<void>, delayMs: number) => () => void;

export interface PollerOptions {
  source: FeedSource;
  gtfs: Gtfs;
  store: Store;
  intervalSeconds: number;
  maxUpdateAgeSeconds: number;
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
  const { source, gtfs, store, intervalSeconds, maxUpdateAgeSeconds, now, schedule, log } = options;
  checkCallBudget(intervalSeconds);
  let running = false;
  let cancelNext: (() => void) | null = null;

  async function pollOnce(): Promise<void> {
    try {
      const feed = await source.fetchFeed();
      const feedTime = feedTimestamp(feed);
      const trips = toTripDelays(feed);
      const fresh = dropStale(trips, feedTime, maxUpdateAgeSeconds);
      const services = fresh.map((trip) => toServiceDelay(trip, gtfs));
      store.set({ feedTimestamp: feedTime, fetchedAt: now().toISOString(), services });
      const stale = trips.length - fresh.length;
      log(`poll ok: ${services.length} services, ${stale} stale dropped, feed time ${feedTime}`);
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
