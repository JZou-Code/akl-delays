import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { FeedError } from './errors.ts';
import { FIXTURE_FEED_PATH, FixtureFeedSource } from './fixture-source.ts';
import { toTripDelays } from './trip-delay.ts';

const recorded = {
  status: 'OK',
  response: {
    header: { timestamp: 1000, gtfs_realtime_version: '2.0' },
    entity: [
      {
        id: 'e1',
        trip_update: {
          trip: { trip_id: 'trip-1', route_id: 'route-1' },
          stop_time_update: { arrival: { delay: 60, time: 1100 }, departure: { time: 1130 } },
          timestamp: 990,
        },
      },
      { id: 'e2', trip_update: { trip: { trip_id: 'trip-2', route_id: 'route-1' } } },
    ],
  },
};

const now = () => new Date(5000 * 1000);

describe('FixtureFeedSource', () => {
  it('reads the file at its path', async () => {
    const readText = vi.fn(() => Promise.resolve(JSON.stringify(recorded)));
    const source = new FixtureFeedSource({ path: '/fixtures/feed.json', readText, now });

    await source.fetchFeed();

    expect(readText).toHaveBeenCalledWith('/fixtures/feed.json');
  });

  it('stamps the header with the current time and moves every other time by the same amount', async () => {
    const readText = () => Promise.resolve(JSON.stringify(recorded));
    const feed = await new FixtureFeedSource({ path: 'feed.json', readText, now }).fetchFeed();
    const update = feed.entity[0]?.trip_update;

    expect(feed.header.timestamp).toBe(5000);
    expect(update?.timestamp).toBe(4990);
    expect(update?.stop_time_update[0]?.arrival).toEqual({ delay: 60, time: 5100 });
    expect(update?.stop_time_update[0]?.departure).toEqual({ time: 5130 });
  });

  it('leaves missing times missing', async () => {
    const readText = () => Promise.resolve(JSON.stringify(recorded));
    const feed = await new FixtureFeedSource({ path: 'feed.json', readText, now }).fetchFeed();
    const update = feed.entity[1]?.trip_update;

    expect(update?.timestamp).toBeUndefined();
    expect(update?.stop_time_update).toEqual([]);
  });

  it('rejects a file that does not match the schema', async () => {
    const readText = () => Promise.resolve('{"status":"OK"}');
    const source = new FixtureFeedSource({ path: 'feed.json', readText, now });

    await expect(source.fetchFeed()).rejects.toThrow(FeedError);
  });
});

describe('the fixture feed file', () => {
  async function fixtureTrips() {
    const readText = (path: string) => readFile(path, 'utf8');
    const source = new FixtureFeedSource({ path: FIXTURE_FEED_PATH, readText, now });
    return toTripDelays(await source.fetchFeed());
  }

  it('holds twenty trips', async () => {
    expect(await fixtureTrips()).toHaveLength(20);
  });

  it('holds the cases the board needs to show', async () => {
    const trips = await fixtureTrips();
    const delays = trips.map((trip) => trip.delaySeconds ?? 0);

    expect(trips.filter((trip) => trip.cancelled)).toHaveLength(2);
    expect(trips.some((trip) => !trip.cancelled && trip.delaySeconds === null)).toBe(true);
    expect(delays.some((delay) => delay < -60)).toBe(true);
    expect(delays.some((delay) => delay > 300 && delay <= 900)).toBe(true);
    expect(delays.some((delay) => delay > 900)).toBe(true);
  });
});
