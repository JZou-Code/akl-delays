import type { DelayStatus, ServiceDelay } from '@akl-delays/shared';
import { describe, expect, it } from 'vitest';
import { parseTimetable } from '../gtfs/timetable.ts';
import type { TripPosition } from '../store/index.ts';
import { departuresAt, type DeparturesInput } from './departures.ts';

// Friday 27 November 2026, 8:00 am in Auckland.
const NOW = new Date('2026-11-26T19:00:00.000Z');

const timetable = parseTimetable({
  trips: [
    'route_id,service_id,trip_id,trip_headsign',
    '70-1,Weekday-1,early,Botany to Britomart',
    '70-1,Weekday-1,later,Botany to Britomart',
    'NX1-1,Weekday-1,nx,Albany to Britomart',
    '70-1,Weekend-1,weekend,Botany to Britomart',
    '70-1,Weekday-1,overnight,Botany to Britomart',
  ].join('\n'),
  calendar: [
    'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
    'Weekday-1,1,1,1,1,1,0,0,20261112,20270207',
    'Weekend-1,0,0,0,0,0,1,1,20261112,20270207',
  ].join('\n'),
  calendarDates: 'service_id,date,exception_type\n',
  stopTimes: [
    'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
    'early,07:50:00,07:50:00,a,1',
    'early,08:00:00,08:00:00,b,2',
    'early,08:10:00,08:10:00,c,3',
    'early,08:20:00,08:20:00,z,4',
    'later,08:20:00,08:20:00,a,1',
    'later,08:30:00,08:30:00,b,2',
    'later,08:40:00,08:40:00,c,3',
    'later,08:50:00,08:50:00,z,4',
    'nx,08:05:00,08:05:00,c,1',
    'nx,08:25:00,08:25:00,d,2',
    'weekend,08:15:00,08:15:00,c,1',
    'weekend,08:25:00,08:25:00,z,2',
    // Thursday's service day runs on: 32:05 is 8:05 am on Friday.
    'overnight,32:05:00,32:05:00,e,1',
    'overnight,32:15:00,32:15:00,z,2',
  ].join('\n'),
});

const ROUTES: Record<string, string> = { '70-1': '70', 'NX1-1': 'NX1' };

function service(tripId: string, delaySeconds: number | null, status: DelayStatus): ServiceDelay {
  return {
    tripId,
    routeId: tripId === 'nx' ? 'NX1-1' : '70-1',
    routeName: null,
    mode: 'bus',
    delaySeconds,
    status,
    stopId: null,
    stopName: null,
    vehicleId: null,
    updatedAt: null,
  };
}

function at(tripId: string, stopSequence: number, scheduledAt: string): TripPosition {
  return { tripId, stopSequence, scheduledAt };
}

function departures(overrides: Partial<DeparturesInput> & { stopId: string }) {
  return departuresAt({
    timetable,
    services: [],
    positions: [],
    route: (routeId) => ({ name: ROUTES[routeId] ?? null, mode: 'bus' }),
    now: NOW,
    includeScheduled: true,
    ...overrides,
  });
}

function clock(iso: string | null): string | null {
  return iso === null
    ? null
    : new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Pacific/Auckland',
        timeStyle: 'short',
      }).format(new Date(iso));
}

describe('departuresAt with no live data', () => {
  it('lists the trips the timetable has at the stop, soonest first', () => {
    const found = departures({ stopId: 'c' });

    expect(found.map((d) => [d.tripId, clock(d.scheduledAt)])).toEqual([
      ['nx', '08:05'],
      ['early', '08:10'],
      ['later', '08:40'],
    ]);
  });

  it('marks them as not live, with no expected time', () => {
    expect(departures({ stopId: 'c' })[0]).toEqual({
      tripId: 'nx',
      routeId: 'NX1-1',
      routeName: 'NX1',
      mode: 'bus',
      headsign: 'Albany to Britomart',
      scheduledAt: '2026-11-26T19:05:00.000Z',
      expectedAt: null,
      delaySeconds: null,
      status: 'unknown',
      live: false,
    });
  });

  it('leaves out a service that does not run on the day', () => {
    expect(departures({ stopId: 'c' }).map((d) => d.tripId)).not.toContain('weekend');
  });

  it('leaves out a time that has passed and one beyond the window', () => {
    expect(departures({ stopId: 'a' }).map((d) => d.tripId)).toEqual(['later']);
    expect(departures({ stopId: 'c', windowMinutes: 20 }).map((d) => d.tripId)).toEqual([
      'nx',
      'early',
    ]);
  });

  it("counts a time past midnight from the day before's service day", () => {
    expect(departures({ stopId: 'e' }).map((d) => clock(d.scheduledAt))).toEqual(['08:05']);
  });

  it('keeps only routes whose name starts with the text', () => {
    expect(departures({ stopId: 'c', routePrefix: ' nx ' }).map((d) => d.tripId)).toEqual(['nx']);
    expect(departures({ stopId: 'c', routePrefix: '7' }).map((d) => d.tripId)).toEqual([
      'early',
      'later',
    ]);
  });

  it('stops at the limit', () => {
    expect(departures({ stopId: 'c', limit: 1 })).toHaveLength(1);
  });

  it('leaves out a trip that ends at the stop, because nobody can board it', () => {
    expect(departures({ stopId: 'd' })).toEqual([]);
    expect(departures({ stopId: 'z' })).toEqual([]);
  });

  it('gives nothing for a stop the timetable does not have', () => {
    expect(departures({ stopId: 'nowhere' })).toEqual([]);
  });

  it('gives nothing when scheduled trips are turned off', () => {
    expect(departures({ stopId: 'c', includeScheduled: false })).toEqual([]);
  });
});

describe('departuresAt with live data', () => {
  it('moves the time by the delay the trip is running with', () => {
    // The trip was due at stop a at 7:50 and is running five minutes late.
    const [first] = departures({
      stopId: 'c',
      routePrefix: '70',
      services: [service('early', 300, 'late')],
      positions: [at('early', 1, '2026-11-26T18:50:00.000Z')],
    });

    expect(first).toMatchObject({
      tripId: 'early',
      live: true,
      status: 'late',
      delaySeconds: 300,
    });
    expect(clock(first?.scheduledAt ?? null)).toBe('08:10');
    expect(clock(first?.expectedAt ?? null)).toBe('08:15');
  });

  it('leaves out a live trip when the feed does not say where it is', () => {
    const found = departures({
      stopId: 'c',
      services: [service('nx', 1200, 'very_late')],
      positions: [],
    });

    expect(found.map((d) => d.tripId)).toEqual(['early', 'later']);
  });

  it('leaves out a trip that has reached or passed the stop', () => {
    const live = {
      services: [service('early', 0, 'on_time')],
      positions: [at('early', 2, '2026-11-26T19:00:00.000Z')],
    };

    expect(departures({ stopId: 'b', ...live }).map((d) => d.tripId)).toEqual(['later']);
    expect(departures({ stopId: 'a', ...live }).map((d) => d.tripId)).toEqual(['later']);
    expect(departures({ stopId: 'c', routePrefix: '70', ...live })[0]?.tripId).toBe('early');
  });

  it('keeps a late trip that has not reached the stop, even past its expected time', () => {
    // Ten minutes early at stop a. Stop b was expected at 7:50 and the trip has not reported there.
    const found = departures({
      stopId: 'b',
      services: [service('early', -600, 'early')],
      positions: [at('early', 1, '2026-11-26T18:50:00.000Z')],
    });

    expect(found[0]).toMatchObject({ tripId: 'early', live: true });
    expect(clock(found[0]?.expectedAt ?? null)).toBe('07:50');
  });

  it('shows a cancelled trip at its scheduled time with no expected time', () => {
    const found = departures({
      stopId: 'c',
      routePrefix: 'NX',
      services: [service('nx', null, 'cancelled')],
    });

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ status: 'cancelled', live: true, expectedAt: null });
    expect(clock(found[0]?.scheduledAt ?? null)).toBe('08:05');
  });

  it('works from the live position alone when scheduled trips are off', () => {
    const found = departures({
      stopId: 'c',
      includeScheduled: false,
      services: [service('early', 120, 'on_time')],
      positions: [at('early', 2, '2026-11-26T19:00:00.000Z')],
    });

    expect(found.map((d) => [d.tripId, clock(d.expectedAt)])).toEqual([['early', '08:12']]);
  });

  it('leaves out a live trip whose reported stop is not in the timetable', () => {
    const found = departures({
      stopId: 'c',
      includeScheduled: false,
      services: [service('early', 0, 'on_time')],
      positions: [at('early', 9, '2026-11-26T19:00:00.000Z')],
    });

    expect(found).toEqual([]);
  });
});
