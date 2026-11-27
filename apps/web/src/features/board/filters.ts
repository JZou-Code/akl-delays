import { DELAY_STATUSES, MODES, type DelayStatus, type Mode } from '@akl-delays/shared';

export interface Filters {
  mode?: Mode | undefined;
  status?: DelayStatus | undefined;
  // The start of a route name.
  route?: string | undefined;
  // Text a stop name holds.
  stop?: string | undefined;
}

export type FilterName = keyof Filters;

function isMode(value: string | null): value is Mode {
  return MODES.some((mode) => mode === value);
}

function isStatus(value: string | null): value is DelayStatus {
  return DELAY_STATUSES.some((status) => status === value);
}

export function filtersFromSearch(search: URLSearchParams): Filters {
  const mode = search.get('mode');
  const status = search.get('status');
  return {
    mode: isMode(mode) ? mode : undefined,
    status: isStatus(status) ? status : undefined,
    route: search.get('route') || undefined,
    stop: search.get('stop') || undefined,
  };
}

export function searchWithFilter(
  search: URLSearchParams,
  name: FilterName,
  value: string,
): URLSearchParams {
  const next = new URLSearchParams(search);
  if (value === '') next.delete(name);
  else next.set(name, value);
  return next;
}

export function hasFilters(filters: Filters): boolean {
  return Object.values(filters).some((value) => value !== undefined);
}
