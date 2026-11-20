import { describe, expect, it } from 'vitest';
import { createMemoryStore, type Snapshot } from './store.ts';

const FETCHED_AT = '2026-11-19T19:00:00.000Z';

function snapshot(fetchedAt = FETCHED_AT): Snapshot {
  return { feedTimestamp: fetchedAt, fetchedAt, services: [] };
}

function clockAt(iso: string) {
  let current = new Date(iso);
  return {
    now: () => current,
    moveSeconds: (seconds: number) => {
      current = new Date(current.getTime() + seconds * 1000);
    },
  };
}

describe('createMemoryStore', () => {
  it('holds nothing at first', () => {
    const store = createMemoryStore({ pollIntervalSeconds: 60, now: () => new Date() });

    expect(store.get()).toBeNull();
  });

  it('gives back the latest snapshot', () => {
    const store = createMemoryStore({ pollIntervalSeconds: 60, now: () => new Date() });
    const first = snapshot('2026-11-19T19:00:00.000Z');
    const second = snapshot('2026-11-19T19:01:00.000Z');

    store.set(first);
    store.set(second);

    expect(store.get()).toBe(second);
  });

  it('is stale before the first snapshot', () => {
    const store = createMemoryStore({ pollIntervalSeconds: 60, now: () => new Date() });

    expect(store.isStale()).toBe(true);
  });

  it('is not stale up to three poll intervals after the last fetch', () => {
    const clock = clockAt(FETCHED_AT);
    const store = createMemoryStore({ pollIntervalSeconds: 60, now: clock.now });
    store.set(snapshot());

    expect(store.isStale()).toBe(false);
    clock.moveSeconds(180);
    expect(store.isStale()).toBe(false);
  });

  it('is stale once three poll intervals have passed without a fetch', () => {
    const clock = clockAt(FETCHED_AT);
    const store = createMemoryStore({ pollIntervalSeconds: 60, now: clock.now });
    store.set(snapshot());

    clock.moveSeconds(181);

    expect(store.isStale()).toBe(true);
  });

  it('is fresh again after a new snapshot', () => {
    const clock = clockAt(FETCHED_AT);
    const store = createMemoryStore({ pollIntervalSeconds: 30, now: clock.now });
    store.set(snapshot());
    clock.moveSeconds(120);

    store.set(snapshot(clock.now().toISOString()));

    expect(store.isStale()).toBe(false);
  });
});
