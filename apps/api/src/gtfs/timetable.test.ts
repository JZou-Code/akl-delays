import { describe, expect, it } from 'vitest';
import { GtfsError } from './csv.ts';
import { parseTimetable, type TimetableTexts } from './timetable.ts';

const STOP_TIMES_HEADER =
  'trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type';

function texts(overrides: Partial<TimetableTexts> = {}): TimetableTexts {
  return {
    trips: [
      'route_id,service_id,trip_id,trip_headsign',
      '70-1,Weekday-1,t1,Botany to Britomart',
      '70-1,Weekend-1,t2,',
    ].join('\n'),
    calendar: [
      'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
      'Weekday-1,1,1,1,1,1,0,0,20261112,20270207',
      'Weekend-1,0,0,0,0,0,1,1,20261112,20270207',
    ].join('\n'),
    calendarDates: ['service_id,date,exception_type', 'Weekday-1,20261225,2'].join('\n'),
    stopTimes: [
      STOP_TIMES_HEADER,
      't1,08:00:00,08:00:00,s1,1,"CITY, CENTRE",0',
      't1,08:04:59,08:05:00,s2,2,"CITY, CENTRE",0',
      't1,08:10:00,08:10:00,s3,3,,0',
      't2,23:55:00,23:55:00,s3,1,,0',
      't2,24:05:00,24:05:00,s1,2,,0',
    ].join('\n'),
    ...overrides,
  };
}

describe('parseTimetable', () => {
  it('reads a trip with its stops in order and the departure time in seconds', () => {
    expect(parseTimetable(texts()).trip('t1')).toEqual({
      tripId: 't1',
      routeId: '70-1',
      serviceId: 'Weekday-1',
      headsign: 'Botany to Britomart',
      stopIds: ['s1', 's2', 's3'],
      sequences: [1, 2, 3],
      seconds: [28800, 29100, 29400],
    });
  });

  it('keeps a time past midnight above 86400 and gives null for an empty headsign', () => {
    const trip = parseTimetable(texts()).trip('t2');

    expect(trip?.seconds).toEqual([86100, 86700]);
    expect(trip?.headsign).toBeNull();
  });

  it('lists the trips that call at a stop', () => {
    const timetable = parseTimetable(texts());

    expect(timetable.tripsAt('s1').map((trip) => trip.tripId)).toEqual(['t1', 't2']);
    expect(timetable.tripsAt('s2').map((trip) => trip.tripId)).toEqual(['t1']);
    expect(timetable.tripsAt('nowhere')).toEqual([]);
  });

  it('puts rows that are out of order into stop order', () => {
    const stopTimes = [
      STOP_TIMES_HEADER,
      't1,08:10:00,08:10:00,s3,3,,0',
      't1,08:00:00,08:00:00,s1,1,,0',
    ].join('\n');

    expect(parseTimetable(texts({ stopTimes })).trip('t1')).toMatchObject({
      stopIds: ['s1', 's3'],
      sequences: [1, 3],
      seconds: [28800, 29400],
    });
  });

  it('leaves out a stop time for a trip that trips.txt does not list', () => {
    const stopTimes = [STOP_TIMES_HEADER, 'ghost,08:00:00,08:00:00,s9,1,,0'].join('\n');

    expect(parseTimetable(texts({ stopTimes })).tripsAt('s9')).toEqual([]);
  });

  it('reads a file with Windows line ends and a last line with no line end', () => {
    const stopTimes = `${STOP_TIMES_HEADER}\r\nt1,08:00:00,08:00:00,s1,1,,0\r\nt1,08:05:00,08:05:00,s2,2,,0`;

    expect(parseTimetable(texts({ stopTimes })).trip('t1')?.stopIds).toEqual(['s1', 's2']);
  });

  it('rejects stop_times.txt with other leading columns', () => {
    const stopTimes = 'stop_id,trip_id,arrival_time\ns1,t1,08:00:00';

    expect(() => parseTimetable(texts({ stopTimes }))).toThrow(GtfsError);
  });

  it('names the row with a time it cannot read', () => {
    const stopTimes = [STOP_TIMES_HEADER, 't1,08:00:00,08:00:00,s1,1,,0', 't1,x,x,s2,2,,0'].join(
      '\n',
    );

    expect(() => parseTimetable(texts({ stopTimes }))).toThrow(
      new GtfsError('stop_times.txt row 2: the trip, time, stop or sequence is not valid'),
    );
  });
});

describe('activeServices', () => {
  const timetable = parseTimetable(texts());

  it('follows the weekday columns', () => {
    expect([...timetable.activeServices('20261127')]).toEqual(['Weekday-1']);
    expect([...timetable.activeServices('20261128')]).toEqual(['Weekend-1']);
  });

  it('gives nothing outside the start and end dates', () => {
    expect(timetable.activeServices('20261111').size).toBe(0);
    expect(timetable.activeServices('20270208').size).toBe(0);
  });

  it('takes out a service that calendar_dates.txt removes for a date', () => {
    expect(timetable.activeServices('20261225').size).toBe(0);
  });

  it('adds a service that calendar_dates.txt adds for a date', () => {
    const calendarDates = ['service_id,date,exception_type', 'Weekend-1,20261127,1'].join('\n');

    expect([...parseTimetable(texts({ calendarDates })).activeServices('20261127')].sort()).toEqual(
      ['Weekday-1', 'Weekend-1'],
    );
  });
});
