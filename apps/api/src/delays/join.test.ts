import { describe, expect, it, vi } from 'vitest';
import { toServiceDelay, type Lookups, type TripInput } from './join.ts';

const trip: TripInput = {
  tripId: 'trip-1',
  routeId: 'NX1-901',
  delaySeconds: 480,
  cancelled: false,
  stopId: '4002-901',
  vehicleId: '51101',
  updatedAt: '2026-11-19T18:59:48.000Z',
};

const lookups: Lookups = {
  route: (routeId) => (routeId === 'NX1-901' ? { name: 'NX1', mode: 'bus' } : undefined),
  stop: (stopId) => (stopId === '4002-901' ? { name: 'Constellation Station' } : undefined),
};

describe('toServiceDelay', () => {
  it('adds the route name, mode, stop name and status to a trip', () => {
    expect(toServiceDelay(trip, lookups)).toEqual({
      tripId: 'trip-1',
      routeId: 'NX1-901',
      routeName: 'NX1',
      mode: 'bus',
      delaySeconds: 480,
      status: 'late',
      stopId: '4002-901',
      stopName: 'Constellation Station',
      vehicleId: '51101',
      updatedAt: '2026-11-19T18:59:48.000Z',
    });
  });

  it('gives a null route name and mode when the route is not in the timetable', () => {
    const service = toServiceDelay({ ...trip, routeId: '66-901' }, lookups);

    expect(service).toMatchObject({ routeId: '66-901', routeName: null, mode: null });
  });

  it('gives a null stop name when the stop is not in the timetable', () => {
    const service = toServiceDelay({ ...trip, stopId: '4099-901' }, lookups);

    expect(service).toMatchObject({ stopId: '4099-901', stopName: null });
  });

  it('does not look up a stop when the trip has none', () => {
    const stop = vi.fn(lookups.stop);

    const service = toServiceDelay({ ...trip, stopId: null }, { ...lookups, stop });

    expect(stop).not.toHaveBeenCalled();
    expect(service.stopName).toBeNull();
  });

  it('gives a cancelled trip the cancelled status', () => {
    expect(toServiceDelay({ ...trip, cancelled: true }, lookups).status).toBe('cancelled');
  });

  it('gives a trip without a delay the unknown status', () => {
    expect(toServiceDelay({ ...trip, delaySeconds: null }, lookups).status).toBe('unknown');
  });
});
