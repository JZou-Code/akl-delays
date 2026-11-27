import type { Departure, Mode, ServiceDelay } from '@akl-delays/shared';
import {
  aucklandDate,
  previousDate,
  serviceDayStart,
  type Timetable,
  type TimetableTrip,
} from '../gtfs/index.ts';
import type { TripPosition } from '../store/index.ts';

export const DEFAULT_WINDOW_MINUTES = 60;
export const DEFAULT_DEPARTURES = 20;
// A trip with no live data stays on the list this long after its scheduled time.
const SCHEDULED_GRACE_SECONDS = 60;

export interface DeparturesInput {
  stopId: string;
  timetable: Timetable;
  services: readonly ServiceDelay[];
  positions: readonly TripPosition[];
  route: (routeId: string) => { name: string | null; mode: Mode | null } | undefined;
  now: Date;
  // The start of a route name. Empty or missing means every route.
  routePrefix?: string | undefined;
  // False for a recording: its clock is moved to now, so the timetable's own times do not fit it.
  includeScheduled: boolean;
  windowMinutes?: number;
  limit?: number;
}

interface Timed {
  at: number;
  departure: Departure;
}

function iso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

// The times from the calendar: the trip's service days that put this stop inside the window.
function calendarTimes(
  trip: TimetableTrip,
  index: number,
  timetable: Timetable,
  dates: readonly string[],
): number[] {
  return dates
    .filter((date) => timetable.activeServices(date).has(trip.serviceId))
    .map((date) => serviceDayStart(date) + trip.seconds[index]!);
}

export function departuresAt(input: DeparturesInput): Departure[] {
  const { stopId, timetable, now, includeScheduled } = input;
  const nowSeconds = now.getTime() / 1000;
  const latest = nowSeconds + (input.windowMinutes ?? DEFAULT_WINDOW_MINUTES) * 60;
  const prefix = input.routePrefix?.trim().toLowerCase() ?? '';
  const live = new Map(input.services.map((service) => [service.tripId, service]));
  const positions = new Map(input.positions.map((position) => [position.tripId, position]));
  const today = aucklandDate(now);
  const dates = [previousDate(today), today];
  const found: Timed[] = [];

  for (const trip of timetable.tripsAt(stopId)) {
    const route = input.route(trip.routeId);
    const routeName = route?.name ?? null;
    if (prefix !== '' && !(routeName ?? trip.routeId).toLowerCase().startsWith(prefix)) continue;
    const service = live.get(trip.tripId);
    const base = {
      tripId: trip.tripId,
      routeId: trip.routeId,
      routeName,
      mode: route?.mode ?? null,
      headsign: trip.headsign,
    };

    // A trip that ends at this stop is an arrival. Nobody can board it.
    const lastIndex = trip.stopIds.length - 1;
    trip.stopIds.forEach((id, index) => {
      if (id !== stopId || index === lastIndex) return;

      if (service !== undefined && service.status !== 'cancelled') {
        const position = positions.get(trip.tripId);
        const reached = position === undefined ? -1 : trip.sequences.indexOf(position.stopSequence);
        // The trip has passed this stop, or the feed does not say where it is.
        if (position === undefined || reached === -1 || index <= reached) return;
        // The timetable gives the gap from the stop the trip reported at to this one.
        const scheduled =
          Date.parse(position.scheduledAt) / 1000 + trip.seconds[index]! - trip.seconds[reached]!;
        // The delay carries on to later stops, as GTFS Realtime says to read it.
        const expected = scheduled + (service.delaySeconds ?? 0);
        if (expected > latest) return;
        found.push({
          at: expected,
          departure: {
            ...base,
            scheduledAt: iso(scheduled),
            expectedAt: iso(expected),
            delaySeconds: service.delaySeconds,
            status: service.status,
            live: true,
          },
        });
        return;
      }

      if (!includeScheduled) return;
      for (const scheduled of calendarTimes(trip, index, timetable, dates)) {
        if (scheduled < nowSeconds - SCHEDULED_GRACE_SECONDS || scheduled > latest) continue;
        found.push({
          at: scheduled,
          departure: {
            ...base,
            scheduledAt: iso(scheduled),
            expectedAt: null,
            delaySeconds: null,
            status: service === undefined ? 'unknown' : 'cancelled',
            live: service !== undefined,
          },
        });
      }
    });
  }

  return found
    .sort((a, b) => a.at - b.at)
    .slice(0, input.limit ?? DEFAULT_DEPARTURES)
    .map(({ departure }) => departure);
}
