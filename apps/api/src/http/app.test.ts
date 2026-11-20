import type { DelayStatus, Mode, ServiceDelay } from '@akl-delays/shared';
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

describe('unknown paths', () => {
  it('answer 404 with an error body', async () => {
    const app = createApp({ store: storeWith(null), feedSource: 'fixture' });

    const response = await request(app).get('/api/nothing-here');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not found' });
  });
});
