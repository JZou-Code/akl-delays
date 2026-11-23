import type { DelayStatus, Mode, ServiceDelay } from '@akl-delays/shared';
import { describe, expect, it } from 'vitest';
import { selectServices, type ServiceQuery } from './select.ts';

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

function tripIds(selected: readonly ServiceDelay[]): string[] {
  return selected.map((item) => item.tripId);
}

function selectedIds(query?: ServiceQuery): string[] {
  return tripIds(selectServices(services, query).services);
}

describe('selectServices', () => {
  it('puts the worst delay first and services without a delay last, keeping ties in order', () => {
    expect(selectedIds()).toEqual([
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
    expect(selectedIds({ mode: 'bus' })).toEqual([
      'bus-late',
      'bus-on-time',
      'bus-early',
      'bus-unknown',
      'bus-cancelled',
    ]);
  });

  it('keeps one status', () => {
    expect(selectedIds({ status: 'late' })).toEqual(['ferry-late', 'bus-late']);
  });

  it('keeps services that match both mode and status', () => {
    expect(selectedIds({ mode: 'bus', status: 'late' })).toEqual(['bus-late']);
  });

  it('returns at most limit services, after sorting', () => {
    expect(selectedIds({ limit: 2 })).toEqual(['train-very-late', 'ferry-late']);
  });

  it('returns every match when the limit is larger than the list', () => {
    expect(selectedIds({ mode: 'ferry', limit: 50 })).toEqual(['ferry-late']);
  });

  it('counts every match, not only the ones within the limit', () => {
    expect(selectServices(services, { mode: 'bus', limit: 2 }).total).toBe(5);
    expect(selectServices(services).total).toBe(8);
  });

  describe('with a search text', () => {
    function named(tripId: string, routeName: string | null, stopName: string | null) {
      return {
        ...service(tripId, 'bus', 'on_time', 0),
        routeId: `${tripId}-205`,
        routeName,
        stopName,
      };
    }
    const named3 = [
      named('seventy', '70', 'Stop A Panmure Station'),
      named('outer', 'OUT', 'Stop C Westfield Newmarket'),
      named('unnamed', null, null),
    ];
    function found(q: string): string[] {
      return tripIds(selectServices(named3, { q }).services);
    }

    it('keeps services whose route name holds the text', () => {
      expect(found('70')).toEqual(['seventy']);
    });

    it('keeps services whose stop name holds the text', () => {
      expect(found('Newmarket')).toEqual(['outer']);
    });

    it('ignores case and spaces around the text', () => {
      expect(found('  newMARKET ')).toEqual(['outer']);
      expect(found('out')).toEqual(['outer']);
    });

    it('looks in the route id only when the route has no name', () => {
      expect(found('unnamed-205')).toEqual(['unnamed']);
      expect(found('205')).toEqual(['unnamed']);
    });

    it('keeps everything for an empty text', () => {
      expect(found('   ')).toHaveLength(3);
    });

    it('keeps nothing when no name holds the text', () => {
      expect(selectServices(named3, { q: 'ferry' })).toEqual({ total: 0, services: [] });
    });

    it('works together with the other filters', () => {
      expect(selectedIds({ q: 'route-1', mode: 'ferry' })).toEqual(['ferry-late']);
    });
  });

  it('leaves the input list as it was', () => {
    const before = tripIds(services);

    selectServices(services, { limit: 1 });

    expect(tripIds(services)).toEqual(before);
  });
});
