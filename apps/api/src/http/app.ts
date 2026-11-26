import type {
  ApiError,
  DelaysPage,
  FeedSourceName,
  Health,
  RouteDetail,
  Summary,
} from '@akl-delays/shared';
import express, { type Express, type Response } from 'express';
import { routeDetail, selectServices, summariseModes } from '../delays/index.ts';
import type { Store } from '../store/index.ts';
import { parseDelaysQuery } from './query.ts';

export interface AppOptions {
  store: Store;
  feedSource: FeedSourceName;
}

const NO_DATA = 'no feed data yet';

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
      assistant: false,
    };
    response.json(body);
  });

  app.get('/api/summary', (_request, response) => {
    const snapshot = store.get();
    if (snapshot === null) {
      sendError(response, 503, NO_DATA);
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
      sendError(response, 503, NO_DATA);
      return;
    }
    const body: DelaysPage = selectServices(snapshot.services, parsed.query);
    response.json(body);
  });

  app.get('/api/routes/:routeId', (request, response) => {
    const snapshot = store.get();
    if (snapshot === null) {
      sendError(response, 503, NO_DATA);
      return;
    }
    const body: RouteDetail | null = routeDetail(snapshot.services, request.params.routeId);
    if (body === null) {
      sendError(response, 404, 'no running services on this route');
      return;
    }
    response.json(body);
  });

  app.use((_request, response) => {
    sendError(response, 404, 'not found');
  });

  return app;
}
