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

  describe('with a sort column', () => {
    function row(tripId: string, overrides: Partial<ServiceDelay>): ServiceDelay {
      return { ...service(tripId, 'bus', 'on_time', 0), ...overrides };
    }
    function sorted(rows: ServiceDelay[], query: ServiceQuery): string[] {
      return tripIds(selectServices(rows, query).services);
    }

    it('sorts by delay, lowest first when ascending, with no delay last either way', () => {
      expect(selectedIds({ sort: 'delay', order: 'asc', mode: 'bus' })).toEqual([
        'bus-early',
        'bus-on-time',
        'bus-late',
        'bus-unknown',
        'bus-cancelled',
      ]);
      expect(selectedIds({ sort: 'delay', mode: 'bus' }).slice(-2)).toEqual([
        'bus-unknown',
        'bus-cancelled',
      ]);
    });

    it('sorts route names with numbers in number order, ignoring case', () => {
      const rows = [
        row('r101', { routeName: '101' }),
        row('out', { routeName: 'OUT' }),
        row('r70', { routeName: '70' }),
        row('nx1', { routeName: 'nx1' }),
      ];

      expect(sorted(rows, { sort: 'route', order: 'asc' })).toEqual(['r70', 'r101', 'nx1', 'out']);
      expect(sorted(rows, { sort: 'route', order: 'desc' })).toEqual(['out', 'nx1', 'r101', 'r70']);
    });

    it('sorts a route with no name by its id', () => {
      const rows = [row('b', { routeName: 'B' }), row('a', { routeId: 'A-205', routeName: null })];

      expect(sorted(rows, { sort: 'route', order: 'asc' })).toEqual(['a', 'b']);
    });

    it('sorts by mode and puts services with no mode last either way', () => {
      expect(selectedIds({ sort: 'mode', order: 'asc', status: 'on_time' })).toEqual([
        'bus-on-time',
        'no-mode',
      ]);
      expect(selectedIds({ sort: 'mode', order: 'desc', status: 'late' })).toEqual([
        'ferry-late',
        'bus-late',
      ]);
      expect(selectedIds({ sort: 'mode', order: 'desc' }).at(-1)).toBe('no-mode');
    });

    it('sorts by status from early to unknown', () => {
      expect(selectedIds({ sort: 'status', order: 'asc', mode: 'bus' })).toEqual([
        'bus-early',
        'bus-on-time',
        'bus-late',
        'bus-cancelled',
        'bus-unknown',
      ]);
    });

    it('sorts by stop name', () => {
      const rows = [
        row('p', { stopName: 'Panmure Station' }),
        row('none', { stopName: null }),
        row('a', { stopName: 'Albany Station' }),
      ];

      expect(sorted(rows, { sort: 'stop', order: 'asc' })).toEqual(['a', 'p', 'none']);
      expect(sorted(rows, { sort: 'stop', order: 'desc' })).toEqual(['p', 'a', 'none']);
    });

    it('puts the worst delay first among services equal in the sort column', () => {
      expect(selectedIds({ sort: 'mode', order: 'asc', mode: 'bus' })).toEqual([
        'bus-late',
        'bus-on-time',
        'bus-early',
        'bus-unknown',
        'bus-cancelled',
      ]);
    });

    it('sorts before it cuts at the limit', () => {
      expect(selectedIds({ sort: 'delay', order: 'asc', limit: 1 })).toEqual(['bus-early']);
    });
  });

  it('leaves the input list as it was', () => {
    const before = tripIds(services);

    selectServices(services, { limit: 1 });

    expect(tripIds(services)).toEqual(before);
  });
});

describe('selectServices by route and stop', () => {
  function at(tripId: string, routeName: string | null, stopName: string | null): ServiceDelay {
    return { ...service(tripId, 'bus', 'late', 300), routeId: `${tripId}-id`, routeName, stopName };
  }

  const running = [
    at('a', '70', 'Panmure Station'),
    at('b', '70', 'Britomart'),
    at('c', '70A', 'Panmure Station'),
    at('d', '170', 'Panmure Station'),
    at('e', 'NX1', 'Stop B Lower Albert'),
    at('f', null, null),
  ];

  function found(query: ServiceQuery): string[] {
    return selectServices(running, query)
      .services.map(({ tripId }) => tripId)
      .sort();
  }

  it('keeps routes whose name starts with the text, ignoring case', () => {
    expect(found({ route: '70' })).toEqual(['a', 'b', 'c']);
    expect(found({ route: ' nx ' })).toEqual(['e']);
  });

  it('matches a route with no name by its id', () => {
    expect(found({ route: 'f-id' })).toEqual(['f']);
  });

  it('keeps stops whose name holds the text, ignoring case', () => {
    expect(found({ stop: 'panmure' })).toEqual(['a', 'c', 'd']);
    expect(found({ stop: 'albert' })).toEqual(['e']);
  });

  it('leaves out a service with no stop name when a stop is asked for', () => {
    expect(found({ stop: 'a' })).not.toContain('f');
  });

  it('combines route and stop', () => {
    expect(found({ route: '70', stop: 'Panmure' })).toEqual(['a', 'c']);
    expect(found({ route: '70', stop: 'Albert' })).toEqual([]);
  });

  it('treats blank text as no filter', () => {
    expect(found({ route: ' ', stop: '' })).toHaveLength(running.length);
  });
});
