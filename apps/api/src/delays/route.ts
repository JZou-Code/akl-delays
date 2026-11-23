import type { RouteDetail, ServiceDelay } from '@akl-delays/shared';
import { selectServices } from './select.ts';

export function routeDetail(
  services: readonly ServiceDelay[],
  routeId: string,
): RouteDetail | null {
  const onRoute = selectServices(
    services.filter((service) => service.routeId === routeId),
  ).services;
  const first = onRoute[0];
  if (first === undefined) return null;
  return { routeId, routeName: first.routeName, mode: first.mode, services: onRoute };
}
