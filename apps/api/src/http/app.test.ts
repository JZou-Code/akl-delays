import type { DelaysPage, DelayStatus, Mode, ServiceDelay } from '@akl-delays/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Snapshot, Store } from '../store/index.ts';
import { createApp } from './app.ts';

function storeWith(snapshot: Snapshot | null, stale = false): Store {
  return { get: () => snapshot, set: () => undefined, isStale: () => stale };
}

function service(
  tripId: string,
  mode: Mode | null,
  status: DelayStatus,
  delaySeconds: number | null,
): ServiceDelay {
  return {
    tripId,
    routeId: 'route-1',
    routeName: mode === null ? null : 'Route 1',
    mode,
    delaySeconds,
    status,
    stopId: null,
    stopName: null,
    vehicleId: null,
    updatedAt: null,
  };
}

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

function snapshotOf(services: ServiceDelay[] = []): Snapshot {
  return {
    feedTimestamp: '2026-11-19T19:00:00.000Z',
    fetchedAt: '2026-11-19T19:00:05.000Z',
    services,
  };
}

describe('GET /api/health', () => {
  it('is not ok before the first poll', async () => {
    const app = createApp({ store: storeWith(null, true), feedSource: 'fixture' });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: false, feedSource: 'fixture', lastFetchedAt: null });
  });

  it('is ok with a fresh snapshot', async () => {
    const app = createApp({ store: storeWith(snapshotOf()), feedSource: 'at' });

    const response = await request(app).get('/api/health');

    expect(response.body).toEqual({
      ok: true,
      feedSource: 'at',
      lastFetchedAt: '2026-11-19T19:00:05.000Z',
    });
  });

  it('is not ok when the snapshot is stale', async () => {
    const app = createApp({ store: storeWith(snapshotOf(), true), feedSource: 'fixture' });

    const response = await request(app).get('/api/health');

    expect(response.body).toMatchObject({ ok: false, lastFetchedAt: '2026-11-19T19:00:05.000Z' });
  });
});

describe('GET /api/summary', () => {
  it('answers 503 before the first poll', async () => {
    const app = createApp({ store: storeWith(null, true), feedSource: 'fixture' });

    const response = await request(app).get('/api/summary');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'no feed data yet' });
  });

  it('gives the feed times, the stale flag and the counts per mode', async () => {
    const services = [
      service('t1', 'bus', 'late', 480),
      service('t2', 'bus', 'on_time', 30),
      service('t3', 'train', 'cancelled', null),
      service('t4', null, 'on_time', 300),
    ];
    const app = createApp({ store: storeWith(snapshotOf(services)), feedSource: 'fixture' });

    const response = await request(app).get('/api/summary');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      feedTimestamp: '2026-11-19T19:00:00.000Z',
      fetchedAt: '2026-11-19T19:00:05.000Z',
      stale: false,
      modes: {
        bus: { ...zero, late: 1, on_time: 1, total: 2 },
        train: { ...zero, cancelled: 1, total: 1 },
        ferry: zero,
      },
    });
  });

  it('says when the snapshot is stale', async () => {
    const app = createApp({ store: storeWith(snapshotOf(), true), feedSource: 'fixture' });

    const response = await request(app).get('/api/summary');

    expect(response.body).toMatchObject({ stale: true });
  });
});

describe('GET /api/delays', () => {
  const services = [
    service('bus-on-time', 'bus', 'on_time', 30),
    service('train-very-late', 'train', 'very_late', 1080),
    service('bus-cancelled', 'bus', 'cancelled', null),
    service('ferry-late', 'ferry', 'late', 540),
    service('bus-late', 'bus', 'late', 600),
  ];
  const app = createApp({ store: storeWith(snapshotOf(services)), feedSource: 'fixture' });

  async function tripIds(path: string): Promise<string[]> {
    const response = await request(app).get(path);
    expect(response.status).toBe(200);
    return (response.body as DelaysPage).services.map((item) => item.tripId);
  }

  it('answers 503 before the first poll', async () => {
    const empty = createApp({ store: storeWith(null, true), feedSource: 'fixture' });

    const response = await request(empty).get('/api/delays');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'no feed data yet' });
  });

  it('lists every service, worst delay first', async () => {
    expect(await tripIds('/api/delays')).toEqual([
      'train-very-late',
      'bus-late',
      'ferry-late',
      'bus-on-time',
      'bus-cancelled',
    ]);
  });

  it('gives each service in full', async () => {
    const response = await request(app).get('/api/delays?limit=1');

    expect(response.body).toEqual({
      total: 5,
      services: [service('train-very-late', 'train', 'very_late', 1080)],
    });
  });

  it('filters by mode and status and cuts the list at the limit', async () => {
    expect(await tripIds('/api/delays?mode=bus')).toEqual([
      'bus-late',
      'bus-on-time',
      'bus-cancelled',
    ]);
    expect(await tripIds('/api/delays?status=late')).toEqual(['bus-late', 'ferry-late']);
    expect(await tripIds('/api/delays?mode=bus&status=late')).toEqual(['bus-late']);
    expect(await tripIds('/api/delays?limit=2')).toEqual(['train-very-late', 'bus-late']);
  });

  it('searches the route and stop names with q', async () => {
    expect(await tripIds('/api/delays?q=ROUTE%201&mode=ferry')).toEqual(['ferry-late']);
    expect(await tripIds('/api/delays?q=nowhere')).toEqual([]);
  });

  it('sorts by the column in sort, in the direction in order', async () => {
    expect(await tripIds('/api/delays?sort=delay&order=asc&mode=bus')).toEqual([
      'bus-on-time',
      'bus-late',
      'bus-cancelled',
    ]);
    expect(await tripIds('/api/delays?sort=mode&order=desc&limit=1')).toEqual(['train-very-late']);
  });

  it('treats an empty value as not set', async () => {
    expect(await tripIds('/api/delays?mode=&status=&limit=')).toHaveLength(5);
  });

  it('ignores query names it does not know', async () => {
    expect(await tripIds('/api/delays?colour=red')).toHaveLength(5);
  });

  it.each([
    ['mode=plane', 'mode must be one of bus, train, ferry'],
    ['mode=bus&mode=train', 'mode must be one of bus, train, ferry'],
    ['status=lost', 'status must be one of early, on_time, late, very_late, cancelled, unknown'],
    [`q=${'x'.repeat(51)}`, 'q must be text of at most 50 characters'],
    ['q=a&q=b', 'q must be text of at most 50 characters'],
    ['sort=colour', 'sort must be one of route, mode, status, delay, stop'],
    ['order=up', 'order must be one of asc, desc'],
    ['limit=0', 'limit must be a whole number above 0'],
    ['limit=-1', 'limit must be a whole number above 0'],
    ['limit=1.5', 'limit must be a whole number above 0'],
    ['limit=ten', 'limit must be a whole number above 0'],
  ])('answers 400 for %s', async (query, error) => {
    const response = await request(app).get(`/api/delays?${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error });
  });

  it('names every bad value in one error', async () => {
    const response = await request(app).get('/api/delays?mode=plane&limit=0');

    expect(response.body).toEqual({
      error: 'mode must be one of bus, train, ferry; limit must be a whole number above 0',
    });
  });

  it('checks the query before it checks for data', async () => {
    const empty = createApp({ store: storeWith(null, true), feedSource: 'fixture' });

    const response = await request(empty).get('/api/delays?mode=plane');

    expect(response.status).toBe(400);
  });
});

describe('GET /api/routes/:routeId', () => {
  function onRoute(tripId: string, routeId: string, delaySeconds: number): ServiceDelay {
    return { ...service(tripId, 'bus', 'on_time', delaySeconds), routeId, routeName: 'NX1' };
  }

  const services = [
    onRoute('nx1-a', 'NX1-901', 30),
    onRoute('70-a', '70-901', 600),
    onRoute('nx1-b', 'NX1-901', 240),
  ];
  const app = createApp({ store: storeWith(snapshotOf(services)), feedSource: 'fixture' });

  it('answers 503 before the first poll', async () => {
    const empty = createApp({ store: storeWith(null, true), feedSource: 'fixture' });

    const response = await request(empty).get('/api/routes/NX1-901');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'no feed data yet' });
  });

  it('gives the route and its running services, worst delay first', async () => {
    const response = await request(app).get('/api/routes/NX1-901');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      routeId: 'NX1-901',
      routeName: 'NX1',
      mode: 'bus',
      services: [onRoute('nx1-b', 'NX1-901', 240), onRoute('nx1-a', 'NX1-901', 30)],
    });
  });

  it('answers 404 for a route with no running service', async () => {
    const response = await request(app).get('/api/routes/WEST-901');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'no running services on this route' });
  });
});

describe('unknown paths', () => {
  it('answer 404 with an error body', async () => {
    const app = createApp({ store: storeWith(null), feedSource: 'fixture' });

    const response = await request(app).get('/api/nothing-here');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not found' });
  });
});
