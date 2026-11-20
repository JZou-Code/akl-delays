import type { ApiError, FeedSourceName, Health, ServiceDelay, Summary } from '@akl-delays/shared';
import express, { type Express, type Response } from 'express';
import { selectServices, summariseModes } from '../delays/index.ts';
import type { Store } from '../store/index.ts';
import { parseDelaysQuery } from './query.ts';

export interface AppOptions {
  store: Store;
  feedSource: FeedSourceName;
}

function sendError(response: Response, status: number, error: string): void {
  const body: ApiError = { error };
  response.status(status).json(body);
}

export function createApp({ store, feedSource }: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_request, response) => {
    const snapshot = store.get();
    const body: Health = {
      ok: snapshot !== null && !store.isStale(),
      feedSource,
      lastFetchedAt: snapshot?.fetchedAt ?? null,
    };
    response.json(body);
  });

  app.get('/api/summary', (_request, response) => {
    const snapshot = store.get();
    if (snapshot === null) {
      sendError(response, 503, 'no feed data yet');
      return;
    }
    const body: Summary = {
      feedTimestamp: snapshot.feedTimestamp,
      fetchedAt: snapshot.fetchedAt,
      stale: store.isStale(),
      modes: summariseModes(snapshot.services),
    };
    response.json(body);
  });

  app.get('/api/delays', (request, response) => {
    const parsed = parseDelaysQuery(request.query);
    if (!parsed.ok) {
      sendError(response, 400, parsed.error);
      return;
    }
    const snapshot = store.get();
    if (snapshot === null) {
      sendError(response, 503, 'no feed data yet');
      return;
    }
    const body: ServiceDelay[] = selectServices(snapshot.services, parsed.query);
    response.json(body);
  });

  app.use((_request, response) => {
    sendError(response, 404, 'not found');
  });

  return app;
}
