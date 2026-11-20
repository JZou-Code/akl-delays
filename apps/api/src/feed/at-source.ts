import { FeedError } from './errors.ts';
import { parseFeed, type Feed } from './schema.ts';
import type { FeedSource } from './source.ts';

export const AT_TRIP_UPDATES_URL = 'https://api.at.govt.nz/realtime/legacy/tripupdates';
const TIMEOUT_MS = 10_000;

export type Fetch = typeof globalThis.fetch;

export interface AtFeedSourceOptions {
  apiKey: string;
  fetch: Fetch;
  url?: string;
}

function statusError(status: number): FeedError {
  if (status === 401) return new FeedError('AT rejected the subscription key (HTTP 401)');
  if (status === 429) return new FeedError('AT call limit reached (HTTP 429)');
  return new FeedError(`AT answered HTTP ${status}`);
}

function requestError(error: unknown): FeedError {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return new FeedError(`AT did not answer within ${TIMEOUT_MS / 1000} seconds`);
  }
  if (!(error instanceof Error)) return new FeedError(`AT request failed: ${String(error)}`);
  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : '';
  return new FeedError(`AT request failed: ${error.message}${cause}`);
}

export class AtFeedSource implements FeedSource {
  readonly #options: AtFeedSourceOptions;

  constructor(options: AtFeedSourceOptions) {
    this.#options = options;
  }

  async fetchFeed(): Promise<Feed> {
    const text = await this.#fetchText();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new FeedError('AT answered with a body that is not JSON');
    }
    return parseFeed(body);
  }

  async #fetchText(): Promise<string> {
    const { apiKey, fetch, url = AT_TRIP_UPDATES_URL } = this.#options;
    try {
      const response = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw statusError(response.status);
      }
      return await response.text();
    } catch (error) {
      throw error instanceof FeedError ? error : requestError(error);
    }
  }
}
