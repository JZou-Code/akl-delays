import { join } from 'node:path';
import { parseRoutes, type Route } from './routes.ts';

export type ReadText = (path: string) => Promise<string>;

export interface Gtfs {
  route(routeId: string): Route | undefined;
}

export async function loadGtfs(dir: string, readText: ReadText): Promise<Gtfs> {
  const routes = parseRoutes(await readText(join(dir, 'routes.txt')));
  return {
    route: (routeId) => routes.get(routeId),
  };
}
