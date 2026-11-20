import type { ApiError, FeedSourceName, Health } from '@akl-delays/shared';
import express, { type Express } from 'express';
import type { Store } from '../store/index.ts';

export interface AppOptions {
  store: Store;
  feedSource: FeedSourceName;
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

  app.use((_request, response) => {
    const body: ApiError = { error: 'not found' };
    response.status(404).json(body);
  });

  return app;
}
