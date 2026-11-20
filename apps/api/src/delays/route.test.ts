import type { DelayStatus, Mode, ServiceDelay } from '@akl-delays/shared';
import { describe, expect, it } from 'vitest';
import { routeDetail } from './route.ts';

function service(
  tripId: string,
  routeId: string,
  routeName: string | null,
  mode: Mode | null,
  status: DelayStatus,
  delaySeconds: number | null,
): ServiceDelay {
  return {
    tripId,
    routeId,
    routeName,
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
  service('nx1-a', 'NX1-901', 'NX1', 'bus', 'on_time', 30),
  service('east-a', 'EAST-901', 'EAST', 'train', 'late', 420),
  service('nx1-b', 'NX1-901', 'NX1', 'bus', 'late', 480),
  service('66-a', '66-901', null, null, 'on_time', 300),
];

describe('routeDetail', () => {
  it('gives the route with its services, worst delay first', () => {
    const detail = routeDetail(services, 'NX1-901');

    expect(detail).toMatchObject({ routeId: 'NX1-901', routeName: 'NX1', mode: 'bus' });
    expect(detail?.services.map((item) => item.tripId)).toEqual(['nx1-b', 'nx1-a']);
  });

  it('gives a null name and mode for a route that is not in the timetable', () => {
    expect(routeDetail(services, '66-901')).toMatchObject({ routeName: null, mode: null });
  });

  it('gives null when no service runs on the route', () => {
    expect(routeDetail(services, 'WEST-901')).toBeNull();
  });
});
