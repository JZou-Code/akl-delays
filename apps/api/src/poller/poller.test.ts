import { describe, expect, it, vi } from 'vitest';
import { FeedError, parseFeed, type Feed, type FeedSource } from '../feed/index.ts';
import type { Gtfs } from '../gtfs/index.ts';
import { createMemoryStore } from '../store/index.ts';
import { CallBudgetError } from './budget.ts';
import { createPoller, toPositions, type Schedule } from './poller.ts';

const NOW = new Date('2026-11-19T19:00:05.000Z');

function feedWith(timestamp: number, delays: number[], updatedAt?: number[]): Feed {
  return parseFeed({
    status: 'OK',
    response: {
      header: { timestamp, gtfs_realtime_version: '2.0' },
      entity: delays.map((delay, index) => ({
        id: `e${index}`,
        trip_update: {
          trip: { trip_id: `trip-${index}`, route_id: 'NX1-901' },
          stop_time_update: { stop_id: '4002-901' },
          delay,
          timestamp: updatedAt?.[index],
        },
      })),
    },
  });
}

const gtfs: Gtfs = {
  route: (routeId) => (routeId === 'NX1-901' ? { routeId, name: 'NX1', mode: 'bus' } : undefined),
  stop: (stopId) =>
    stopId === '4002-901' ? { stopId, name: 'Constellation Station', code: '4002' } : undefined,
  stops: () => [],
  timetable: null,
};

function fakeSchedule() {
  const pending: { callback: () => Promise<void>; delayMs: number; cancelled: boolean }[] = [];
  const schedule: Schedule = (callback, delayMs) => {
    const entry = { callback, delayMs, cancelled: false };
    pending.push(entry);
    return () => {
      entry.cancelled = true;
    };
  };
  async function fire(): Promise<void> {
    const entry = pending.shift();
    if (entry === undefined || entry.cancelled) throw new Error('no poll is waiting');
    await entry.callback();
  }
  return { schedule, pending, fire };
}

function setup(fetchFeed: FeedSource['fetchFeed'], intervalSeconds = 60) {
  const timer = fakeSchedule();
  const store = createMemoryStore({ pollIntervalSeconds: intervalSeconds, now: () => NOW });
  const log = vi.fn<(line: string) => void>();
  const source = { fetchFeed: vi.fn(fetchFeed) };
  const poller = createPoller({
    source,
    gtfs,
    store,
    intervalSeconds,
    maxUpdateAgeSeconds: 1200,
    now: () => NOW,
    schedule: timer.schedule,
    log,
  });
  return { poller, store, log, source, timer };
}

describe('createPoller', () => {
  it('polls on start and stores the services with their route and stop names', async () => {
    const { poller, store } = setup(() => Promise.resolve(feedWith(1795114800, [480])));

    await poller.start();

    expect(store.get()).toEqual({
      feedTimestamp: '2026-11-19T19:00:00.000Z',
      fetchedAt: '2026-11-19T19:00:05.000Z',
      services: [
        {
          tripId: 'trip-0',
          routeId: 'NX1-901',
          routeName: 'NX1',
          mode: 'bus',
          delaySeconds: 480,
          status: 'late',
          stopId: '4002-901',
          stopName: 'Constellation Station',
          vehicleId: null,
          updatedAt: null,
        },
      ],
      positions: [],
    });
  });

  it('logs one line for a poll that works', async () => {
    const { poller, log } = setup(() => Promise.resolve(feedWith(1795114800, [480, 0])));

    await poller.start();

    expect(log).toHaveBeenCalledWith(
      'poll ok: 2 services, 0 stale dropped, feed time 2026-11-19T19:00:00.000Z',
    );
  });

  it('leaves out trips last updated before the age limit and counts them in the log', async () => {
    const updatedAt = [1795114790, 1795114800 - 1201];
    const { poller, store, log } = setup(() =>
      Promise.resolve(feedWith(1795114800, [480, -27023], updatedAt)),
    );

    await poller.start();

    expect(store.get()?.services.map((service) => service.tripId)).toEqual(['trip-0']);
    expect(log).toHaveBeenCalledWith(
      'poll ok: 1 services, 1 stale dropped, feed time 2026-11-19T19:00:00.000Z',
    );
  });

  it('schedules the next poll one interval after the last one ends', async () => {
    const { poller, timer } = setup(() => Promise.resolve(feedWith(1795114800, [0])), 90);

    await poller.start();

    expect(timer.pending.map((entry) => entry.delayMs)).toEqual([90_000]);
  });

  it('polls again when the timer fires and replaces the snapshot', async () => {
    const feeds = [feedWith(1795114800, [0]), feedWith(1795114860, [0, 60])];
    const { poller, store, source, timer } = setup(() => Promise.resolve(feeds.shift()!));

    await poller.start();
    await timer.fire();

    expect(source.fetchFeed).toHaveBeenCalledTimes(2);
    expect(store.get()?.services).toHaveLength(2);
    expect(timer.pending).toHaveLength(1);
  });

  it('keeps the last snapshot and logs one line when a poll fails', async () => {
    const fetchFeed = vi
      .fn<FeedSource['fetchFeed']>()
      .mockResolvedValueOnce(feedWith(1795114800, [480]))
      .mockRejectedValueOnce(new FeedError('AT call limit reached (HTTP 429)\nretry later'));
    const { poller, store, log, timer } = setup(fetchFeed);

    await poller.start();
    const before = store.get();
    await timer.fire();

    expect(store.get()).toBe(before);
    expect(log).toHaveBeenLastCalledWith(
      'poll failed: AT call limit reached (HTTP 429) retry later',
    );
  });

  it('keeps polling after a failed first poll', async () => {
    const { poller, store, timer } = setup(() => Promise.reject(new Error('fetch failed')));

    await poller.start();

    expect(store.get()).toBeNull();
    expect(timer.pending).toHaveLength(1);
  });

  it('cancels the waiting poll on stop', async () => {
    const { poller, timer } = setup(() => Promise.resolve(feedWith(1795114800, [0])));

    await poller.start();
    poller.stop();

    expect(timer.pending[0]?.cancelled).toBe(true);
  });

  it('schedules nothing when stopped during a poll', async () => {
    let finish: (feed: Feed) => void = () => undefined;
    const { poller, timer } = setup(
      () =>
        new Promise<Feed>((resolve) => {
          finish = resolve;
        }),
    );

    const first = poller.start();
    poller.stop();
    finish(feedWith(1795114800, [0]));
    await first;

    expect(timer.pending).toHaveLength(0);
  });

  it('starts only one loop when started twice', async () => {
    const { poller, source, timer } = setup(() => Promise.resolve(feedWith(1795114800, [0])));

    await Promise.all([poller.start(), poller.start()]);

    expect(source.fetchFeed).toHaveBeenCalledTimes(1);
    expect(timer.pending).toHaveLength(1);
  });

  it('refuses an interval that would go over the weekly call limit', () => {
    expect(() => setup(() => Promise.resolve(feedWith(1795114800, [])), 10)).toThrow(
      CallBudgetError,
    );
  });
});

describe('toPositions', () => {
  const trip = {
    tripId: 't1',
    routeId: 'r1',
    delaySeconds: 0,
    cancelled: false,
    stopId: 's1',
    vehicleId: null,
    updatedAt: null,
  };

  it('keeps the trips that say where they last reported and when', () => {
    expect(
      toPositions([
        { ...trip, stopSequence: 4, stopScheduledAt: '2026-11-19T19:00:00.000Z' },
        { ...trip, tripId: 't2', stopSequence: null, stopScheduledAt: '2026-11-19T19:00:00.000Z' },
        { ...trip, tripId: 't3', stopSequence: 2, stopScheduledAt: null },
      ]),
    ).toEqual([{ tripId: 't1', stopSequence: 4, scheduledAt: '2026-11-19T19:00:00.000Z' }]);
  });
});
