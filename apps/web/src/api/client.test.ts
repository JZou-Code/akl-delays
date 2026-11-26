import type { AskResponse, Health, RouteDetail, ServiceDelay, Summary } from '@akl-delays/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  ApiRequestError,
  ask,
  failureReason,
  getDelays,
  getHealth,
  getRoute,
  getSummary,
  isNoDataYet,
  isNotFound,
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
    const health: Health = {
      ok: true,
      feedSource: 'fixture',
      lastFetchedAt: null,
      assistant: false,
    };
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
  it('returns the services and the total', async () => {
    const page = { total: 1, services: [service] };

    expect(await getDelays({}, { fetch: answering(page) })).toEqual(page);
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

  it('puts the search text and the sort in the query', async () => {
    const fetch = answering([]);

    await getDelays({ q: 'stop a', sort: 'route', order: 'asc' }, { fetch });

    expect(calledPath(fetch)).toBe('/api/delays?q=stop+a&sort=route&order=asc');
  });

  it('leaves an empty search text out', async () => {
    const fetch = answering([]);

    await getDelays({ q: '', mode: 'bus' }, { fetch });

    expect(calledPath(fetch)).toBe('/api/delays?mode=bus');
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

describe('isNotFound', () => {
  it('is true for the 404 the API gives for a route with nothing running', () => {
    expect(isNotFound(new ApiRequestError(404, 'no running services on this route'))).toBe(true);
  });

  it('is false for other errors', () => {
    expect(isNotFound(new ApiRequestError(503, 'no feed data yet'))).toBe(false);
    expect(isNotFound(new TypeError('Failed to fetch'))).toBe(false);
  });
});

describe('failureReason', () => {
  it('gives the message of an API error', () => {
    expect(failureReason(new ApiRequestError(502, 'the API answered HTTP 502'))).toBe(
      'the API answered HTTP 502',
    );
  });

  it('says the API could not be reached for any other error', () => {
    expect(failureReason(new TypeError('Failed to fetch'))).toBe('could not reach the API');
  });
});

describe('ask', () => {
  const answer: AskResponse = {
    answer: 'Two buses are cancelled.',
    steps: [{ tool: 'list_delays', input: { status: 'cancelled' }, summary: '2 services' }],
    model: 'claude-haiku-5-5',
    usage: { inputTokens: 900, outputTokens: 40 },
    feedTimestamp: '2026-11-19T19:00:00.000Z',
  };

  it('posts the question as JSON and returns the answer', async () => {
    const fetch = answering(answer);
    const signal = new AbortController().signal;

    expect(await ask('Is anything cancelled?', { fetch, signal })).toEqual(answer);

    const [path, init] = fetch.mock.calls[0] ?? [];
    expect(path).toBe('/api/ask');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    expect(init?.body).toBe('{"question":"Is anything cancelled?"}');
    expect(init?.signal).toBe(signal);
  });

  it('fails with the reason the API gives', async () => {
    const fetch = answering(
      { error: 'the hourly question limit is reached, try again later' },
      429,
    );

    await expect(ask('Anything?', { fetch })).rejects.toThrow(
      new ApiRequestError(429, 'the hourly question limit is reached, try again later'),
    );
  });
});
