import { describe, expect, it } from 'vitest';
import { dropStale } from './stale.ts';
import type { TripDelay } from './trip-delay.ts';

const FEED_TIME = '2026-11-23T21:51:49.552Z';

function trip(tripId: string, updatedAt: string | null): TripDelay {
  return {
    tripId,
    routeId: '32-203',
    delaySeconds: 0,
    cancelled: false,
    stopId: null,
    vehicleId: null,
    updatedAt,
  };
}

function kept(trips: TripDelay[], maxAgeSeconds = 1200): string[] {
  return dropStale(trips, FEED_TIME, maxAgeSeconds).map((each) => each.tripId);
}

describe('dropStale', () => {
  it('keeps a trip updated within the limit', () => {
    expect(kept([trip('recent', '2026-11-23T21:50:00.000Z')])).toEqual(['recent']);
  });

  it('drops a trip updated before the limit', () => {
    expect(kept([trip('old', '2026-11-23T15:57:41.000Z')])).toEqual([]);
  });

  it('keeps a trip exactly at the limit and drops one a second older', () => {
    const trips = [
      trip('at-limit', '2026-11-23T21:31:49.552Z'),
      trip('past-limit', '2026-11-23T21:31:48.552Z'),
    ];

    expect(kept(trips)).toEqual(['at-limit']);
  });

  it('keeps a trip with no update time', () => {
    expect(kept([trip('no-time', null)])).toEqual(['no-time']);
  });

  it('keeps a cancelled trip of any age', () => {
    const cancelled = { ...trip('cancelled', '2026-11-23T20:58:00.000Z'), cancelled: true };

    expect(kept([cancelled])).toEqual(['cancelled']);
  });

  it('keeps a trip updated after the feed time', () => {
    expect(kept([trip('ahead', '2026-11-23T21:52:10.000Z')])).toEqual(['ahead']);
  });

  it('uses the limit it is given', () => {
    const trips = [trip('two-minutes-old', '2026-11-23T21:49:49.552Z')];

    expect(kept(trips, 60)).toEqual([]);
    expect(kept(trips, 120)).toEqual(['two-minutes-old']);
  });

  it('keeps the order of the trips', () => {
    const trips = [
      trip('a', '2026-11-23T21:51:00.000Z'),
      trip('old', '2026-11-23T10:00:00.000Z'),
      trip('b', '2026-11-23T21:50:00.000Z'),
    ];

    expect(kept(trips)).toEqual(['a', 'b']);
  });
});
