import { describe, expect, it } from 'vitest';
import { FeedError } from './errors.ts';
import { parseFeed } from './schema.ts';

const header = { timestamp: 1795633200, gtfs_realtime_version: '2.0', incrementality: 0 };

function body(response: unknown): unknown {
  return { status: 'OK', response };
}

describe('parseFeed', () => {
  it('returns the header and the entity list', () => {
    const feed = parseFeed(body({ header, entity: [{ id: 'e1' }] }));

    expect(feed.header).toEqual(header);
    expect(feed.entity).toHaveLength(1);
  });

  it('gives an empty entity list when the feed leaves it out', () => {
    expect(parseFeed(body({ header })).entity).toEqual([]);
  });

  it('accepts incrementality as a name or a number', () => {
    const named = parseFeed(body({ header: { ...header, incrementality: 'FULL_DATASET' } }));

    expect(named.header.incrementality).toBe('FULL_DATASET');
  });

  it('accepts a header without incrementality', () => {
    const feed = parseFeed(body({ header: { timestamp: 1, gtfs_realtime_version: '2.0' } }));

    expect(feed.header.incrementality).toBeUndefined();
  });

  it('accepts fields it does not know', () => {
    const feed = parseFeed({
      status: 'OK',
      error: null,
      response: { header: { ...header, feed_version: 'x' }, entity: [], extra: true },
    });

    expect(feed.header.timestamp).toBe(header.timestamp);
  });

  it('rejects a status other than OK', () => {
    expect(() => parseFeed({ status: 'ERROR', response: { header } })).toThrow(FeedError);
  });

  it.each([null, 'OK', 42, []])('rejects the body %j', (value) => {
    expect(() => parseFeed(value)).toThrow(FeedError);
  });

  it('accepts a header timestamp with a fraction of a second', () => {
    const feed = parseFeed(body({ header: { ...header, timestamp: 1795470709.552 } }));

    expect(feed.header.timestamp).toBe(1795470709.552);
  });

  it('rejects a negative header timestamp', () => {
    expect(() => parseFeed(body({ header: { ...header, timestamp: -1 } }))).toThrow(
      /response\.header\.timestamp/,
    );
  });

  it('rejects a header without a version', () => {
    expect(() => parseFeed(body({ header: { timestamp: 1 } }))).toThrow(
      /response\.header\.gtfs_realtime_version/,
    );
  });

  it('names at most three problems and counts the rest', () => {
    const error = catchError(() =>
      parseFeed({ status: 'NO', response: { header: { timestamp: 'x' }, entity: 'y' } }),
    );

    expect(error.message.split('; ')).toHaveLength(4);
    expect(error.message).toMatch(/; and 1 more$/);
  });
});

describe('parseFeed trip updates', () => {
  const trip = { trip_id: 'trip-1', route_id: 'route-1' };

  function firstUpdate(tripUpdate: unknown) {
    const feed = parseFeed(body({ header, entity: [{ id: 'e1', trip_update: tripUpdate }] }));
    return feed.entity[0]?.trip_update;
  }

  it('reads every field of a trip update', () => {
    const update = firstUpdate({
      trip: {
        ...trip,
        direction_id: 1,
        start_time: '08:15:00',
        start_date: '20261120',
        schedule_relationship: 'SCHEDULED',
      },
      stop_time_update: [
        {
          stop_sequence: 4,
          stop_id: 'stop-1',
          arrival: { delay: 120, time: 1795633300 },
          departure: { delay: 150, time: 1795633330 },
          schedule_relationship: 'SCHEDULED',
        },
      ],
      vehicle: { id: 'vehicle-1', label: 'AMP 401' },
      timestamp: 1795633190,
      delay: 120,
    });

    expect(update).toEqual({
      trip: {
        ...trip,
        direction_id: 1,
        start_time: '08:15:00',
        start_date: '20261120',
        schedule_relationship: 'SCHEDULED',
      },
      stop_time_update: [
        {
          stop_sequence: 4,
          stop_id: 'stop-1',
          arrival: { delay: 120, time: 1795633300 },
          departure: { delay: 150, time: 1795633330 },
          schedule_relationship: 'SCHEDULED',
        },
      ],
      vehicle: { id: 'vehicle-1', label: 'AMP 401' },
      timestamp: 1795633190,
      delay: 120,
    });
  });

  it('turns a single stop time update object into a list of one', () => {
    const update = firstUpdate({ trip, stop_time_update: { stop_id: 'stop-1' } });

    expect(update?.stop_time_update).toEqual([{ stop_id: 'stop-1' }]);
  });

  it('keeps a list of stop time updates in order', () => {
    const update = firstUpdate({
      trip,
      stop_time_update: [{ stop_id: 'stop-1' }, { stop_id: 'stop-2' }],
    });

    expect(update?.stop_time_update.map((stop) => stop.stop_id)).toEqual(['stop-1', 'stop-2']);
  });

  it('gives an empty list when there is no stop time update', () => {
    expect(firstUpdate({ trip })?.stop_time_update).toEqual([]);
  });

  it.each([
    ['CANCELED', 'CANCELED'],
    [3, 'CANCELED'],
    [0, 'SCHEDULED'],
    [42, '42'],
  ])('reads the trip schedule relationship %j as %s', (value, name) => {
    const update = firstUpdate({ trip: { ...trip, schedule_relationship: value } });

    expect(update?.trip.schedule_relationship).toBe(name);
  });

  it('reads a stop schedule relationship given as a number', () => {
    const update = firstUpdate({ trip, stop_time_update: { schedule_relationship: 1 } });

    expect(update?.stop_time_update[0]?.schedule_relationship).toBe('SKIPPED');
  });

  it('accepts an entity without a trip update and fields it does not know', () => {
    const feed = parseFeed(
      body({
        header,
        entity: [
          { id: 'e1', vehicle: { position: { latitude: -36.8 } } },
          { id: 'e2', is_deleted: true, trip_update: { trip, occupancy: 'FULL' } },
        ],
      }),
    );

    expect(feed.entity[0]?.trip_update).toBeUndefined();
    expect(feed.entity[1]?.is_deleted).toBe(true);
  });

  it.each([
    ['trip_id', { route_id: 'route-1' }],
    ['route_id', { trip_id: 'trip-1' }],
  ])('rejects a trip without %s', (field, partialTrip) => {
    expect(() => firstUpdate({ trip: partialTrip })).toThrow(
      `response.entity.0.trip_update.trip.${field}`,
    );
  });

  it('rejects a delay that is not a number', () => {
    expect(() => firstUpdate({ trip, delay: '120' })).toThrow(
      'response.entity.0.trip_update.delay',
    );
  });
});

function catchError(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) return error;
  }
  throw new Error('expected an error');
}
