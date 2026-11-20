import type { Summary } from '@akl-delays/shared';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../api/index.ts';
import type { Polling } from '../hooks/index.ts';
import { bannerState } from './banner-state.ts';

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

const summary: Summary = {
  feedTimestamp: '2026-11-19T19:00:00.000Z',
  fetchedAt: '2026-11-19T19:00:05.000Z',
  stale: false,
  modes: { bus: zero, train: zero, ferry: zero },
};

function polling<T>(state: Partial<Polling<T>>): Polling<T> {
  return { data: undefined, error: undefined, loading: false, ...state };
}

const down = new ApiRequestError(502, 'the API answered HTTP 502');

describe('bannerState', () => {
  it('has nothing to report when the data is fresh and every request worked', () => {
    expect(bannerState(polling({ data: summary }), polling({ data: [] }))).toEqual({
      stale: false,
      failure: undefined,
      fetchedAt: '2026-11-19T19:00:05.000Z',
    });
  });

  it('takes the stale flag from the summary', () => {
    expect(bannerState(polling({ data: { ...summary, stale: true } })).stale).toBe(true);
  });

  it('reports a failed summary request when it has earlier data', () => {
    expect(bannerState(polling({ data: summary, error: down })).failure).toBe(down);
  });

  it('reports a failed request for the other data on the page', () => {
    expect(
      bannerState(polling({ data: summary }), polling({ data: [], error: down })).failure,
    ).toBe(down);
  });

  it('leaves a failure with no earlier data to the section that shows it', () => {
    expect(bannerState(polling({ error: down }), polling({ error: down })).failure).toBeUndefined();
  });

  it('leaves the 404 for a route with nothing running to the route view', () => {
    const notFound = new ApiRequestError(404, 'no running services on this route');

    expect(
      bannerState(polling({ data: summary }), polling({ data: {}, error: notFound })).failure,
    ).toBeUndefined();
  });

  it('has no time and no stale flag before the first summary', () => {
    expect(bannerState(polling({ loading: true }))).toEqual({
      stale: false,
      failure: undefined,
      fetchedAt: undefined,
    });
  });
});
