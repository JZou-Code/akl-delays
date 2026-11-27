import {
  DELAY_STATUSES,
  type DelaysPage,
  type DelayStatus,
  type Mode,
  type ServiceDelay,
  type SortKey,
  type SortOrder,
} from '@akl-delays/shared';

export interface ServiceQuery {
  mode?: Mode | undefined;
  status?: DelayStatus | undefined;
  q?: string | undefined;
  // The start of the route name.
  route?: string | undefined;
  // Text the stop name holds.
  stop?: string | undefined;
  sort?: SortKey | undefined;
  order?: SortOrder | undefined;
  limit?: number | undefined;
}

function matchesText(service: ServiceDelay, text: string): boolean {
  const names = [service.routeName ?? service.routeId, service.stopName];
  return names.some((name) => name?.toLowerCase().includes(text) === true);
}

function routeStartsWith(service: ServiceDelay, text: string): boolean {
  return (service.routeName ?? service.routeId).toLowerCase().startsWith(text);
}

function stopHolds(service: ServiceDelay, text: string): boolean {
  return service.stopName?.toLowerCase().includes(text) === true;
}

type SortValue = string | number | null;

const STATUS_RANK = new Map<DelayStatus, number>(
  DELAY_STATUSES.map((status, index) => [status, index]),
);

const SORT_VALUE: Readonly<Record<SortKey, (service: ServiceDelay) => SortValue>> = {
  route: (service) => service.routeName ?? service.routeId,
  mode: (service) => service.mode,
  status: (service) => STATUS_RANK.get(service.status) ?? null,
  delay: (service) => service.delaySeconds,
  stop: (service) => service.stopName ?? service.stopId,
};

// numeric puts route 70 before route 101.
const names = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function compareValues(a: SortValue, b: SortValue, order: SortOrder): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const ascending =
    typeof a === 'number' && typeof b === 'number' ? a - b : names.compare(String(a), String(b));
  return order === 'asc' ? ascending : -ascending;
}

function comparing(key: SortKey, order: SortOrder) {
  const value = SORT_VALUE[key];
  return (a: ServiceDelay, b: ServiceDelay): number =>
    compareValues(value(a), value(b), order) ||
    compareValues(a.delaySeconds, b.delaySeconds, 'desc');
}

export function selectServices(
  services: readonly ServiceDelay[],
  query: ServiceQuery = {},
): DelaysPage {
  const text = query.q?.trim().toLowerCase() ?? '';
  const route = query.route?.trim().toLowerCase() ?? '';
  const stop = query.stop?.trim().toLowerCase() ?? '';
  const selected = services
    .filter((service) => query.mode === undefined || service.mode === query.mode)
    .filter((service) => query.status === undefined || service.status === query.status)
    .filter((service) => text === '' || matchesText(service, text))
    .filter((service) => route === '' || routeStartsWith(service, route))
    .filter((service) => stop === '' || stopHolds(service, stop))
    .sort(comparing(query.sort ?? 'delay', query.order ?? 'desc'));
  return { total: selected.length, services: selected.slice(0, query.limit) };
}
