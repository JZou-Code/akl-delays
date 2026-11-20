import type { ServiceDelay } from '@akl-delays/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Snapshot, Store } from '../store/index.ts';
import { createApp } from './app.ts';

function storeWith(snapshot: Snapshot | null, stale = false): Store {
  return { get: () => snapshot, set: () => undefined, isStale: () => stale };
}

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

describe('unknown paths', () => {
  it('answer 404 with an error body', async () => {
    const app = createApp({ store: storeWith(null), feedSource: 'fixture' });

    const response = await request(app).get('/api/nothing-here');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not found' });
  });
});
