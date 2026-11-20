import type { Health, RouteDetail, ServiceDelay, Summary } from '@akl-delays/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  ApiRequestError,
  getDelays,
  getHealth,
  getRoute,
  getSummary,
  isNoDataYet,
  type Fetch,
} from './client.ts';

function answering(body: unknown, status = 200) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return vi.fn<Fetch>(() => Promise.resolve(new Response(text, { status })));
}

function calledPath(fetch: ReturnType<typeof answering>): unknown {
  return fetch.mock.calls[0]?.[0];
}

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

const summary: Summary = {
  feedTimestamp: '2026-11-19T19:00:00.000Z',
  fetchedAt: '2026-11-19T19:00:05.000Z',
  stale: false,
  modes: { bus: { ...zero, late: 1, total: 1 }, train: zero, ferry: zero },
};

const service: ServiceDelay = {
  tripId: 'nx1-0715-1',
  routeId: 'NX1-901',
  routeName: 'NX1',
  mode: 'bus',
  delaySeconds: 480,
  status: 'late',
  stopId: '4002-901',
  stopName: 'Constellation Station',
  vehicleId: '51101',
  updatedAt: '2026-11-19T18:59:48.000Z',
};

describe('getHealth', () => {
  it('returns the health body', async () => {
    const health: Health = { ok: true, feedSource: 'fixture', lastFetchedAt: null };
    const fetch = answering(health);

    expect(await getHealth({ fetch })).toEqual(health);
    expect(calledPath(fetch)).toBe('/api/health');
  });
});

describe('getSummary', () => {
  it('asks for JSON and passes the abort signal on', async () => {
    const fetch = answering(summary);
    const signal = new AbortController().signal;

    expect(await getSummary({ fetch, signal })).toEqual(summary);

    const [path, init] = fetch.mock.calls[0] ?? [];
    expect(path).toBe('/api/summary');
    expect(new Headers(init?.headers).get('Accept')).toBe('application/json');
    expect(init?.signal).toBe(signal);
  });
});

describe('getDelays', () => {
  it('returns the services', async () => {
    expect(await getDelays({}, { fetch: answering([service]) })).toEqual([service]);
  });

  it('leaves the query out when nothing is set', async () => {
    const fetch = answering([]);

    await getDelays({}, { fetch });

    expect(calledPath(fetch)).toBe('/api/delays');
  });

  it('puts mode, status and limit in the query', async () => {
    const fetch = answering([]);

    await getDelays({ mode: 'train', status: 'very_late', limit: 20 }, { fetch });

    expect(calledPath(fetch)).toBe('/api/delays?mode=train&status=very_late&limit=20');
  });
});

describe('getRoute', () => {
  it('returns the route detail', async () => {
    const detail: RouteDetail = {
      routeId: 'NX1-901',
      routeName: 'NX1',
      mode: 'bus',
      services: [service],
    };
    const fetch = answering(detail);

    expect(await getRoute('NX1-901', { fetch })).toEqual(detail);
    expect(calledPath(fetch)).toBe('/api/routes/NX1-901');
  });

  it('encodes the route id', async () => {
    const fetch = answering({ routeId: 'a/b c', routeName: null, mode: null, services: [] });

    await getRoute('a/b c', { fetch });

    expect(calledPath(fetch)).toBe('/api/routes/a%2Fb%20c');
  });
});

describe('errors', () => {
  it.each([
    [503, 'no feed data yet'],
    [404, 'no running services on this route'],
    [400, 'mode must be one of bus, train, ferry'],
  ])('turns HTTP %i into an error with the status and the API message', async (status, error) => {
    const result = getRoute('NX1-901', { fetch: answering({ error }, status) });

    await expect(result).rejects.toThrow(new ApiRequestError(status, error));
    await expect(result).rejects.toMatchObject({ name: 'ApiRequestError', status });
  });

  it('names the status when the error body is not JSON', async () => {
    const result = getSummary({ fetch: answering('<html>Bad Gateway</html>', 502) });

    await expect(result).rejects.toThrow(new ApiRequestError(502, 'the API answered HTTP 502'));
  });

  it('names the status when the error body has no error field', async () => {
    const result = getSummary({ fetch: answering({ message: 'no' }, 500) });

    await expect(result).rejects.toThrow(new ApiRequestError(500, 'the API answered HTTP 500'));
  });

  it('fails when a 200 body is not JSON', async () => {
    const result = getSummary({ fetch: answering('not json') });

    await expect(result).rejects.toThrow(
      new ApiRequestError(200, 'the API answered with a body that is not JSON'),
    );
  });

  it('passes a failed request on as it is', async () => {
    const failure = new TypeError('Failed to fetch');
    const fetch = vi.fn<Fetch>(() => Promise.reject(failure));

    await expect(getSummary({ fetch })).rejects.toBe(failure);
  });
});

describe('isNoDataYet', () => {
  it('is true for the 503 the API gives before its first poll', () => {
    expect(isNoDataYet(new ApiRequestError(503, 'no feed data yet'))).toBe(true);
  });

  it('is false for other errors', () => {
    expect(isNoDataYet(new ApiRequestError(502, 'the API answered HTTP 502'))).toBe(false);
    expect(isNoDataYet(new TypeError('Failed to fetch'))).toBe(false);
    expect(isNoDataYet(undefined)).toBe(false);
  });
});
