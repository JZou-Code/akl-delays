import type {
  ApiError,
  DelayStatus,
  Health,
  Mode,
  RouteDetail,
  ServiceDelay,
  Summary,
} from '@akl-delays/shared';

export type Fetch = typeof globalThis.fetch;

export interface CallOptions {
  fetch: Fetch;
  signal?: AbortSignal;
}

export interface DelaysQuery {
  mode?: Mode;
  status?: DelayStatus;
  limit?: number;
}

export class ApiRequestError extends Error {
  override name = 'ApiRequestError';
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isNoDataYet(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 503;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 404;
}

function isApiError(body: unknown): body is ApiError {
  return (
    typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
  );
}

async function errorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => undefined);
  return isApiError(body) ? body.error : `the API answered HTTP ${response.status}`;
}

async function getJson<T>(path: string, { fetch, signal }: CallOptions): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new ApiRequestError(response.status, await errorMessage(response));
  try {
    return (await response.json()) as T;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new ApiRequestError(response.status, 'the API answered with a body that is not JSON');
  }
}

function delaysPath({ mode, status, limit }: DelaysQuery): string {
  const params = new URLSearchParams();
  if (mode !== undefined) params.set('mode', mode);
  if (status !== undefined) params.set('status', status);
  if (limit !== undefined) params.set('limit', String(limit));
  const search = params.toString();
  return search === '' ? '/api/delays' : `/api/delays?${search}`;
}

export function getHealth(options: CallOptions): Promise<Health> {
  return getJson('/api/health', options);
}

export function getSummary(options: CallOptions): Promise<Summary> {
  return getJson('/api/summary', options);
}

export function getDelays(query: DelaysQuery, options: CallOptions): Promise<ServiceDelay[]> {
  return getJson(delaysPath(query), options);
}

export function getRoute(routeId: string, options: CallOptions): Promise<RouteDetail> {
  return getJson(`/api/routes/${encodeURIComponent(routeId)}`, options);
}
