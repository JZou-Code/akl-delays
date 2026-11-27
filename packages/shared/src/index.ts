export const MODES = ['bus', 'train', 'ferry'] as const;
export type Mode = (typeof MODES)[number];

export const DELAY_STATUSES = [
  'early',
  'on_time',
  'late',
  'very_late',
  'cancelled',
  'unknown',
] as const;
export type DelayStatus = (typeof DELAY_STATUSES)[number];

// The columns GET /api/delays can sort by.
export const SORT_KEYS = ['route', 'mode', 'status', 'delay', 'stop'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export type FeedSourceName = 'fixture' | 'at';

// Every time field is an ISO 8601 string in UTC.

export interface ServiceDelay {
  tripId: string;
  routeId: string;
  routeName: string | null;
  mode: Mode | null;
  delaySeconds: number | null;
  status: DelayStatus;
  stopId: string | null;
  stopName: string | null;
  vehicleId: string | null;
  updatedAt: string | null;
}

export interface ModeSummary extends Record<DelayStatus, number> {
  total: number;
}

export interface Summary {
  feedTimestamp: string;
  fetchedAt: string;
  stale: boolean;
  modes: Record<Mode, ModeSummary>;
}

// total counts every service that matches the query; services holds at most limit of them.
export interface DelaysPage {
  total: number;
  services: ServiceDelay[];
}

export interface RouteDetail {
  routeId: string;
  routeName: string | null;
  mode: Mode | null;
  services: ServiceDelay[];
}

export interface Health {
  ok: boolean;
  feedSource: FeedSourceName;
  lastFetchedAt: string | null;
  // True when POST /api/ask can answer. It needs an Anthropic key on the server.
  assistant: boolean;
}

export const QUESTION_MAX_LENGTH = 300;

export interface AskRequest {
  question: string;
}

// One tool call the model made on the way to its answer.
export interface AskStep {
  tool: string;
  input: Record<string, unknown>;
  summary: string;
}

export interface AskUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AskResponse {
  answer: string;
  steps: AskStep[];
  model: string;
  usage: AskUsage;
  feedSource: FeedSourceName;
  feedTimestamp: string;
}

export interface ApiError {
  error: string;
}
