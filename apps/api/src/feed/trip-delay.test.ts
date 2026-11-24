import { describe, expect, it } from 'vitest';
import { parseFeed } from './schema.ts';
import { feedTimestamp, toTripDelays } from './trip-delay.ts';

const trip = { trip_id: 'trip-1', route_id: 'route-1' };

function feedOf(...tripUpdates: unknown[]) {
  return parseFeed({
    status: 'OK',
    response: {
      header: { timestamp: 1795114800, gtfs_realtime_version: '2.0' },
      entity: tripUpdates.map((tripUpdate, index) => ({
        id: `e${index}`,
        trip_update: tripUpdate,
      })),
    },
  });
}

function onlyTrip(tripUpdate: unknown) {
  const [first] = toTripDelays(feedOf(tripUpdate));
  if (first === undefined) throw new Error('expected one trip');
  return first;
}

describe('toTripDelays', () => {
  it('turns a trip update into a trip delay', () => {
    const result = onlyTrip({
      trip,
      stop_time_update: { stop_id: 'stop-1', arrival: { delay: 240 } },
      vehicle: { id: 'vehicle-1' },
      timestamp: 1795114790,
    });

    expect(result).toEqual({
      tripId: 'trip-1',
      routeId: 'route-1',
      delaySeconds: 240,
      cancelled: false,
      stopId: 'stop-1',
      vehicleId: 'vehicle-1',
      updatedAt: '2026-11-19T18:59:50.000Z',
    });
  });

  it('prefers the trip delay over the stop delays', () => {
    const result = onlyTrip({
      trip,
      delay: 60,
      stop_time_update: { arrival: { delay: 120 }, departure: { delay: 180 } },
    });

    expect(result.delaySeconds).toBe(60);
  });

  it('uses the arrival delay before the departure delay', () => {
    const result = onlyTrip({
      trip,
      stop_time_update: { arrival: { delay: 120 }, departure: { delay: 180 } },
    });

    expect(result.delaySeconds).toBe(120);
  });

  it('falls back to the departure delay', () => {
    const result = onlyTrip({ trip, stop_time_update: { departure: { delay: -30 } } });

    expect(result.delaySeconds).toBe(-30);
  });

  it('gives null when no delay value is present', () => {
    const result = onlyTrip({ trip, stop_time_update: { stop_id: 'stop-1' } });

    expect(result.delaySeconds).toBeNull();
  });

  it('reads the first of several stop time updates', () => {
    const result = onlyTrip({
      trip,
      stop_time_update: [
        { stop_id: 'stop-1', arrival: { delay: 90 } },
        { stop_id: 'stop-2', arrival: { delay: 400 } },
      ],
    });

    expect(result).toMatchObject({ stopId: 'stop-1', delaySeconds: 90 });
  });

  it.each(['CANCELED', 3])('marks a trip with schedule relationship %j as cancelled', (value) => {
    const result = onlyTrip({ trip: { ...trip, schedule_relationship: value } });

    expect(result.cancelled).toBe(true);
  });

  it('does not mark a scheduled trip as cancelled', () => {
    expect(onlyTrip({ trip: { ...trip, schedule_relationship: 0 } }).cancelled).toBe(false);
  });

  it('gives null for a missing stop, vehicle and timestamp', () => {
    expect(onlyTrip({ trip })).toMatchObject({ stopId: null, vehicleId: null, updatedAt: null });
  });

  it('gives null for a vehicle with an empty id', () => {
    expect(onlyTrip({ trip, vehicle: { id: '' } }).vehicleId).toBeNull();
  });

  it('skips deleted entities and entities without a trip update', () => {
    const feed = parseFeed({
      status: 'OK',
      response: {
        header: { timestamp: 1795114800, gtfs_realtime_version: '2.0' },
        entity: [
          { id: 'kept', trip_update: { trip } },
          { id: 'deleted', is_deleted: true, trip_update: { trip } },
          { id: 'vehicle-only', vehicle: {} },
        ],
      },
    });

    expect(toTripDelays(feed)).toHaveLength(1);
  });
});

describe('feedTimestamp', () => {
  it('gives the header time as an ISO string', () => {
    expect(feedTimestamp(feedOf())).toBe('2026-11-19T19:00:00.000Z');
  });

  it('keeps the milliseconds of a header time', () => {
    const feed = parseFeed({
      status: 'OK',
      response: { header: { timestamp: 1795114800.552, gtfs_realtime_version: '1.0' } },
    });

    expect(feedTimestamp(feed)).toBe('2026-11-19T19:00:00.552Z');
  });
});
