import { join } from 'node:path';
import { parseRoutes, type Route } from './routes.ts';
import { parseStops, type Stop } from './stops.ts';

export type ReadText = (path: string) => Promise<string>;

export interface Gtfs {
  route(routeId: string): Route | undefined;
  stop(stopId: string): Stop | undefined;
}

export async function loadGtfs(dir: string, readText: ReadText): Promise<Gtfs> {
  const [routesText, stopsText] = await Promise.all([
    readText(join(dir, 'routes.txt')),
    readText(join(dir, 'stops.txt')),
  ]);
  const routes = parseRoutes(routesText);
  const stops = parseStops(stopsText);
  return {
    route: (routeId) => routes.get(routeId),
    stop: (stopId) => stops.get(stopId),
  };
}
