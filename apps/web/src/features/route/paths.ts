export const ROUTE_PATH = '/routes/:routeId';

export function routePath(routeId: string): string {
  return `/routes/${encodeURIComponent(routeId)}`;
}
