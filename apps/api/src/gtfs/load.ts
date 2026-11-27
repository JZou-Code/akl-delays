import { join } from 'node:path';
import { parseRoutes, schoolRoute, type Route } from './routes.ts';
import { parseStops, type Stop } from './stops.ts';
import { parseTimetable, type Timetable } from './timetable.ts';

export type ReadText = (path: string) => Promise<string>;

export interface Gtfs {
  route(routeId: string): Route | undefined;
  stop(stopId: string): Stop | undefined;
  stops(): Stop[];
  // null when the folder has no stop_times.txt.
  timetable: Timetable | null;
}

export const TIMETABLE_FILES = [
  'trips.txt',
  'calendar.txt',
  'calendar_dates.txt',
  'stop_times.txt',
] as const;

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

// The timetable is optional. A folder that has only routes.txt and stops.txt still loads.
async function loadTimetable(dir: string, readText: ReadText): Promise<Timetable | null> {
  let stopTimes: string;
  try {
    stopTimes = await readText(join(dir, 'stop_times.txt'));
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
  const [trips, calendar, calendarDates] = await Promise.all([
    readText(join(dir, 'trips.txt')),
    readText(join(dir, 'calendar.txt')),
    readText(join(dir, 'calendar_dates.txt')),
  ]);
  return parseTimetable({ trips, calendar, calendarDates, stopTimes });
}

export async function loadGtfs(dir: string, readText: ReadText): Promise<Gtfs> {
  const [routesText, stopsText, timetable] = await Promise.all([
    readText(join(dir, 'routes.txt')),
    readText(join(dir, 'stops.txt')),
    loadTimetable(dir, readText),
  ]);
  const routes = parseRoutes(routesText);
  const stops = parseStops(stopsText);
  return {
    route: (routeId) => routes.get(routeId) ?? schoolRoute(routeId),
    stop: (stopId) => stops.get(stopId),
    stops: () => [...stops.values()],
    timetable,
  };
}
