import type { ServiceDelay } from '@akl-delays/shared';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { composeApi, type Deps } from './compose.ts';
import { loadConfig } from './config/index.ts';
import { FIXTURE_FEED_PATH, type Fetch } from './feed/index.ts';

const NOW = new Date('2026-11-20T08:30:00.000Z');

function deps(fetch: Fetch = vi.fn<Fetch>()): Deps {
  return {
    readText: (path) => readFile(path, 'utf8'),
    fetch,
    now: () => NOW,
    schedule: () => () => undefined,
    log: () => undefined,
  };
}

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

describe('composeApi on the fixture files', () => {
  it('answers 503 until the first poll', async () => {
    const { app } = await composeApi(loadConfig({}), deps());

    expect((await request(app).get('/api/summary')).status).toBe(503);
  });

  it('serves a current summary of the fixture feed after the first poll', async () => {
    const { app, poller } = await composeApi(loadConfig({}), deps());
    await poller.start();

    const response = await request(app).get('/api/summary');

    expect(response.body).toEqual({
      feedTimestamp: NOW.toISOString(),
      fetchedAt: NOW.toISOString(),
      stale: false,
      modes: {
        bus: { early: 1, on_time: 4, late: 2, very_late: 1, cancelled: 1, unknown: 1, total: 10 },
        train: { ...zero, early: 1, on_time: 2, late: 1, very_late: 1, cancelled: 1, total: 6 },
        ferry: { ...zero, on_time: 2, late: 1, total: 3 },
      },
    });
  });

  it('lists the worst delays first, with route and stop names from the GTFS files', async () => {
    const { app, poller } = await composeApi(loadConfig({}), deps());
    await poller.start();

    const response = await request(app).get('/api/delays?limit=2');
    const [first, second] = response.body as ServiceDelay[];

    expect(first).toMatchObject({
      routeName: '70',
      mode: 'bus',
      delaySeconds: 1260,
      status: 'very_late',
      stopName: 'Panmure Station',
    });
    expect(second).toMatchObject({ routeName: 'STH', mode: 'train', status: 'very_late' });
  });

  it('lists a service whose route is not in the GTFS files without a name or mode', async () => {
    const { app, poller } = await composeApi(loadConfig({}), deps());
    await poller.start();

    const response = await request(app).get('/api/routes/66-901');

    expect(response.body).toMatchObject({ routeId: '66-901', routeName: null, mode: null });
  });
});

describe('composeApi with FEED_SOURCE=at', () => {
  it('reads the feed through fetch', async () => {
    const body = await readFile(FIXTURE_FEED_PATH, 'utf8');
    const fetch = vi.fn<Fetch>(() => Promise.resolve(new Response(body)));
    const config = loadConfig({ FEED_SOURCE: 'at', AT_API_KEY: 'test-key' });
    const { app, poller } = await composeApi(config, deps(fetch));

    await poller.start();
    const health = await request(app).get('/api/health');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(health.body).toMatchObject({ feedSource: 'at' });
    expect((await request(app).get('/api/delays')).body).toHaveLength(20);
  });
});
