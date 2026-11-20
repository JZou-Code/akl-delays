import type { DelayStatus, Mode, ServiceDelay } from '@akl-delays/shared';

export interface ServiceQuery {
  mode?: Mode | undefined;
  status?: DelayStatus | undefined;
  limit?: number | undefined;
}

function worstFirst(a: ServiceDelay, b: ServiceDelay): number {
  if (a.delaySeconds === b.delaySeconds) return 0;
  if (a.delaySeconds === null) return 1;
  if (b.delaySeconds === null) return -1;
  return b.delaySeconds - a.delaySeconds;
}

export function selectServices(
  services: readonly ServiceDelay[],
  query: ServiceQuery = {},
): ServiceDelay[] {
  const selected = services
    .filter((service) => query.mode === undefined || service.mode === query.mode)
    .filter((service) => query.status === undefined || service.status === query.status)
    .sort(worstFirst);
  return query.limit === undefined ? selected : selected.slice(0, query.limit);
}
