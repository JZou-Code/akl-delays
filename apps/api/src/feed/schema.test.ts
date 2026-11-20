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

  it('rejects a timestamp that is not whole seconds', () => {
    expect(() => parseFeed(body({ header: { ...header, timestamp: 1.5 } }))).toThrow(
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

function catchError(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) return error;
  }
  throw new Error('expected an error');
}
