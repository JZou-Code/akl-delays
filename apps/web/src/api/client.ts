import type {
  ApiError,
  AskRequest,
  AskResponse,
  DelaysPage,
  DelayStatus,
  Health,
  Mode,
  RouteDetail,
  SortKey,
  SortOrder,
  StopDepartures,
  StopsPage,
  Summary,
} from '@akl-delays/shared';

export type Fetch = typeof globalThis.fetch;

export interface CallOptions {
  fetch: Fetch;
  signal?: AbortSignal;
}

export interface DelaysQuery {
  mode?: Mode | undefined;
  status?: DelayStatus | undefined;
  q?: string | undefined;
  route?: string | undefined;
  stop?: string | undefined;
  sort?: SortKey | undefined;
  order?: SortOrder | undefined;
  limit?: number | undefined;
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

export function failureReason(error: Error): string {
  return error instanceof ApiRequestError ? error.message : 'could not reach the API';
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

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiRequestError(response.status, await errorMessage(response));
  try {
    return (await response.json()) as T;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new ApiRequestError(response.status, 'the API answered with a body that is not JSON');
  }
}

async function getJson<T>(path: string, { fetch, signal }: CallOptions): Promise<T> {
  return readJson(await fetch(path, { headers: { Accept: 'application/json' }, signal }));
}

async function postJson<T>(path: string, body: unknown, options: CallOptions): Promise<T> {
  const { fetch, signal } = options;
  return readJson(
    await fetch(path, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    }),
  );
}

function delaysPath(query: DelaysQuery): string {
  const params = new URLSearchParams();
  for (const name of ['mode', 'status', 'q', 'route', 'stop', 'sort', 'order', 'limit'] as const) {
    const value = query[name];
    if (value !== undefined && value !== '') params.set(name, String(value));
  }
  const search = params.toString();
  return search === '' ? '/api/delays' : `/api/delays?${search}`;
}

export function getHealth(options: CallOptions): Promise<Health> {
  return getJson('/api/health', options);
}

export function getSummary(options: CallOptions): Promise<Summary> {
  return getJson('/api/summary', options);
}

export function getDelays(query: DelaysQuery, options: CallOptions): Promise<DelaysPage> {
  return getJson(delaysPath(query), options);
}

export function getRoute(routeId: string, options: CallOptions): Promise<RouteDetail> {
  return getJson(`/api/routes/${encodeURIComponent(routeId)}`, options);
}

export function searchStops(text: string, options: CallOptions): Promise<StopsPage> {
  return getJson(`/api/stops?${new URLSearchParams({ q: text }).toString()}`, options);
}

export function getDepartures(
  stopId: string,
  route: string,
  options: CallOptions,
): Promise<StopDepartures> {
  const path = `/api/stops/${encodeURIComponent(stopId)}/departures`;
  const search = route === '' ? '' : `?${new URLSearchParams({ route }).toString()}`;
  return getJson(path + search, options);
}

export function ask(question: string, options: CallOptions): Promise<AskResponse> {
  const body: AskRequest = { question };
  return postJson('/api/ask', body, options);
}
