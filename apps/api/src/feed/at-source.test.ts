import { describe, expect, it, vi } from 'vitest';
import { AT_TRIP_UPDATES_URL, AtFeedSource, type Fetch } from './at-source.ts';
import { FeedError } from './errors.ts';

const API_KEY = 'test-key-123';

const validBody = JSON.stringify({
  status: 'OK',
  response: {
    header: { timestamp: 1795114800, gtfs_realtime_version: '2.0' },
    entity: [{ id: 'e1', trip_update: { trip: { trip_id: 'trip-1', route_id: 'route-1' } } }],
  },
});

function answering(body: string, status = 200) {
  return vi.fn<Fetch>(() => Promise.resolve(new Response(body, { status })));
}

function failing(error: Error) {
  return vi.fn<Fetch>(() => Promise.reject(error));
}

function sourceWith(fetch: Fetch) {
  return new AtFeedSource({ apiKey: API_KEY, fetch });
}

describe('AtFeedSource', () => {
  it('calls the trip updates URL with the key in the header and asks for JSON', async () => {
    const fetch = answering(validBody);

    await sourceWith(fetch).fetchFeed();

    const [url, init] = fetch.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(url).toBe(AT_TRIP_UPDATES_URL);
    expect(headers.get('Ocp-Apim-Subscription-Key')).toBe(API_KEY);
    expect(headers.get('Accept')).toBe('application/json');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('calls another URL when one is given', async () => {
    const fetch = answering(validBody);

    await new AtFeedSource({
      apiKey: API_KEY,
      fetch,
      url: 'https://example.test/feed',
    }).fetchFeed();

    expect(fetch.mock.calls[0]?.[0]).toBe('https://example.test/feed');
  });

  it('returns the parsed feed', async () => {
    const feed = await sourceWith(answering(validBody)).fetchFeed();

    expect(feed.header.timestamp).toBe(1795114800);
    expect(feed.entity).toHaveLength(1);
  });

  it.each([
    [401, 'AT rejected the subscription key (HTTP 401)'],
    [429, 'AT call limit reached (HTTP 429)'],
    [500, 'AT answered HTTP 500'],
  ])('fails on HTTP %i', async (status, message) => {
    const result = sourceWith(answering('{"message":"no"}', status)).fetchFeed();

    await expect(result).rejects.toThrow(new FeedError(message));
  });

  it('fails on a body that is not JSON', async () => {
    const result = sourceWith(answering('<html>busy</html>')).fetchFeed();

    await expect(result).rejects.toThrow(new FeedError('AT answered with a body that is not JSON'));
  });

  it('fails on JSON that does not match the schema', async () => {
    const result = sourceWith(answering('{"status":"OK","response":{}}')).fetchFeed();

    await expect(result).rejects.toThrow(/^feed does not match the schema/);
  });

  it('fails when AT does not answer in time', async () => {
    const result = sourceWith(
      failing(new DOMException('The operation timed out.', 'TimeoutError')),
    ).fetchFeed();

    await expect(result).rejects.toThrow(new FeedError('AT did not answer within 10 seconds'));
  });

  it('fails with the cause when the request cannot be made', async () => {
    const error = new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND') });
    const result = sourceWith(failing(error)).fetchFeed();

    await expect(result).rejects.toThrow(
      new FeedError('AT request failed: fetch failed (getaddrinfo ENOTFOUND)'),
    );
  });

  it('keeps the key out of error messages', async () => {
    const result = sourceWith(answering(API_KEY, 401)).fetchFeed();

    await expect(result).rejects.toThrow(FeedError);
    await expect(result).rejects.not.toThrow(API_KEY);
  });
});
