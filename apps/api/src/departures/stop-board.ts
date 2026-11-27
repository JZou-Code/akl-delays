import type { Departure, StopSummary } from '@akl-delays/shared';
import type { Gtfs } from '../gtfs/index.ts';
import type { Snapshot } from '../store/index.ts';
import { departuresAt } from './departures.ts';
import { searchStops } from './stops.ts';

export interface StopBoardOptions {
  gtfs: Gtfs;
  now: () => Date;
  // False for a recording: its clock is moved to now, so the timetable's own times do not fit it.
  includeScheduled: boolean;
}

export interface DeparturesQuery {
  routePrefix?: string | undefined;
  limit?: number | undefined;
}

// Stop search and departures over one loaded timetable.
export interface StopBoard {
  search(text: string, limit?: number): StopSummary[];
  // undefined for a stop that no trip in the timetable calls at.
  stop(stopId: string): StopSummary | undefined;
  departures(stopId: string, snapshot: Snapshot, query?: DeparturesQuery): Departure[];
}

// null when the GTFS folder has no timetable.
export function createStopBoard({
  gtfs,
  now,
  includeScheduled,
}: StopBoardOptions): StopBoard | null {
  const { timetable } = gtfs;
  if (timetable === null) return null;
  const hasTrips = (stopId: string) => timetable.tripsAt(stopId).length > 0;
  const stops: StopSummary[] = gtfs
    .stops()
    .map(({ stopId, code, name }) => ({ stopId, code, name }));
  return {
    search: (text, limit) => searchStops({ stops, hasTrips, text, limit }),
    stop: (stopId) => {
      const stop = gtfs.stop(stopId);
      if (stop === undefined || !hasTrips(stopId)) return undefined;
      return { stopId, code: stop.code, name: stop.name };
    },
    departures: (stopId, snapshot, query = {}) =>
      departuresAt({
        stopId,
        timetable,
        services: snapshot.services,
        positions: snapshot.positions,
        route: (routeId) => gtfs.route(routeId),
        now: now(),
        includeScheduled,
        routePrefix: query.routePrefix,
        ...(query.limit === undefined ? {} : { limit: query.limit }),
      }),
  };
}
