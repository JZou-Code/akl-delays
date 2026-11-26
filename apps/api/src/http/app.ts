import type {
  ApiError,
  AskResponse,
  DelaysPage,
  FeedSourceName,
  Health,
  RouteDetail,
  Summary,
} from '@akl-delays/shared';
import express, { type ErrorRequestHandler, type Express, type Response } from 'express';
import { AskError, type AskFailure, type Assistant } from '../assistant/index.ts';
import { routeDetail, selectServices, summariseModes } from '../delays/index.ts';
import type { Store } from '../store/index.ts';
import { parseAskBody } from './ask-body.ts';
import { parseDelaysQuery } from './query.ts';

export interface AppOptions {
  store: Store;
  feedSource: FeedSourceName;
  // null when no Anthropic key is set.
  assistant: Assistant | null;
}

const NO_DATA = 'no feed data yet';

const ASK_FAILURE_STATUS: Readonly<Record<AskFailure, number>> = {
  no_data: 503,
  limit: 429,
  failed: 502,
};

// express.json fails with a status of its own for a body that is not JSON or is too large.
const onError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    sendError(response, status, 'the request body could not be read');
    return;
  }
  sendError(response, 500, 'the API failed');
};

function sendError(response: Response, status: number, error: string): void {
  const body: ApiError = { error };
  response.status(status).json(body);
}

export function createApp({ store, feedSource, assistant }: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_request, response) => {
    const snapshot = store.get();
    const body: Health = {
      ok: snapshot !== null && !store.isStale(),
      feedSource,
      lastFetchedAt: snapshot?.fetchedAt ?? null,
      assistant: assistant !== null,
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

  app.post('/api/ask', express.json({ limit: '2kb' }), async (request, response) => {
    const parsed = parseAskBody(request.body);
    if (!parsed.ok) {
      sendError(response, 400, parsed.error);
      return;
    }
    if (assistant === null) {
      sendError(response, 503, 'the assistant is not set up');
      return;
    }
    try {
      const body: AskResponse = await assistant.ask(parsed.body.question);
      response.json(body);
    } catch (error) {
      if (!(error instanceof AskError)) throw error;
      sendError(response, ASK_FAILURE_STATUS[error.failure], error.message);
    }
  });

  app.use((_request, response) => {
    sendError(response, 404, 'not found');
  });

  app.use(onError);

  return app;
}
