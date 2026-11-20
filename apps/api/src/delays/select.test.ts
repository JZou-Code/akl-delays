import type { DelayStatus, Mode, ServiceDelay } from '@akl-delays/shared';
import { describe, expect, it } from 'vitest';
import { selectServices } from './select.ts';

function service(
  tripId: string,
  mode: Mode | null,
  status: DelayStatus,
  delaySeconds: number | null,
): ServiceDelay {
  return {
    tripId,
    routeId: 'route-1',
    routeName: null,
    mode,
    delaySeconds,
    status,
    stopId: null,
    stopName: null,
    vehicleId: null,
    updatedAt: null,
  };
}

const services = [
  service('bus-on-time', 'bus', 'on_time', 30),
  service('bus-unknown', 'bus', 'unknown', null),
  service('train-very-late', 'train', 'very_late', 1080),
  service('bus-early', 'bus', 'early', -150),
  service('ferry-late', 'ferry', 'late', 540),
  service('bus-cancelled', 'bus', 'cancelled', null),
  service('no-mode', null, 'on_time', 300),
  service('bus-late', 'bus', 'late', 540),
];

function tripIds(selected: ServiceDelay[]): string[] {
  return selected.map((item) => item.tripId);
}

describe('selectServices', () => {
  it('puts the worst delay first and services without a delay last, keeping ties in order', () => {
    expect(tripIds(selectServices(services))).toEqual([
      'train-very-late',
      'ferry-late',
      'bus-late',
      'no-mode',
      'bus-on-time',
      'bus-early',
      'bus-unknown',
      'bus-cancelled',
    ]);
  });

  it('keeps one mode', () => {
    expect(tripIds(selectServices(services, { mode: 'bus' }))).toEqual([
      'bus-late',
      'bus-on-time',
      'bus-early',
      'bus-unknown',
      'bus-cancelled',
    ]);
  });

  it('keeps one status', () => {
    expect(tripIds(selectServices(services, { status: 'late' }))).toEqual([
      'ferry-late',
      'bus-late',
    ]);
  });

  it('keeps services that match both mode and status', () => {
    expect(tripIds(selectServices(services, { mode: 'bus', status: 'late' }))).toEqual([
      'bus-late',
    ]);
  });

  it('returns at most limit services, after sorting', () => {
    expect(tripIds(selectServices(services, { limit: 2 }))).toEqual([
      'train-very-late',
      'ferry-late',
    ]);
  });

  it('returns every match when the limit is larger than the list', () => {
    expect(selectServices(services, { mode: 'ferry', limit: 50 })).toHaveLength(1);
  });

  it('leaves the input list as it was', () => {
    const before = tripIds(services);

    selectServices(services, { limit: 1 });

    expect(tripIds(services)).toEqual(before);
  });
});
