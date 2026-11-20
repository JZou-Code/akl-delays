import type { DelayStatus, Mode, ServiceDelay } from '@akl-delays/shared';
import { describe, expect, it } from 'vitest';
import { summariseModes } from './summary.ts';

let nextTrip = 0;

function service(mode: Mode | null, status: DelayStatus): ServiceDelay {
  nextTrip += 1;
  return {
    tripId: `trip-${nextTrip}`,
    routeId: 'route-1',
    routeName: null,
    mode,
    delaySeconds: null,
    status,
    stopId: null,
    stopName: null,
    vehicleId: null,
    updatedAt: null,
  };
}

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

describe('summariseModes', () => {
  it('counts each status per mode, with a total', () => {
    const modes = summariseModes([
      service('bus', 'late'),
      service('bus', 'late'),
      service('bus', 'on_time'),
      service('bus', 'cancelled'),
      service('train', 'very_late'),
      service('train', 'early'),
      service('ferry', 'unknown'),
    ]);

    expect(modes).toEqual({
      bus: { ...zero, late: 2, on_time: 1, cancelled: 1, total: 4 },
      train: { ...zero, very_late: 1, early: 1, total: 2 },
      ferry: { ...zero, unknown: 1, total: 1 },
    });
  });

  it('gives zero counts for every mode when there are no services', () => {
    expect(summariseModes([])).toEqual({ bus: zero, train: zero, ferry: zero });
  });

  it('leaves out services that have no mode', () => {
    const modes = summariseModes([service(null, 'late'), service('bus', 'late')]);

    expect(modes.bus.total).toBe(1);
    expect(modes.train.total + modes.ferry.total).toBe(0);
  });
});
