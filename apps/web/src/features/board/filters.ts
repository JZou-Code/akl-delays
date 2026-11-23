import { DELAY_STATUSES, MODES, type DelayStatus, type Mode } from '@akl-delays/shared';

export interface Filters {
  mode?: Mode | undefined;
  status?: DelayStatus | undefined;
  q?: string | undefined;
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
    q: search.get('q') || undefined,
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

export function hasFilters({ mode, status, q }: Filters): boolean {
  return mode !== undefined || status !== undefined || q !== undefined;
}
