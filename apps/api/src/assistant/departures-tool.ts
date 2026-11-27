import type { Departure } from '@akl-delays/shared';
import { z } from 'zod';
import type { StopBoard } from '../departures/index.ts';
import { defineTool, type AssistantTool } from './tools.ts';

const MAX_DEPARTURES = 8;
const MAX_STOPS = 6;

const aucklandClock = new Intl.DateTimeFormat('en-NZ', {
  timeZone: 'Pacific/Auckland',
  hour: 'numeric',
  minute: '2-digit',
});

// AT writes a trip as "Botany To Britomart Via Panmure". The rider wants where it goes.
function destination(headsign: string | null): string | null {
  if (headsign === null) return null;
  const to = headsign.toLowerCase().lastIndexOf(' to ');
  return to === -1 ? headsign : headsign.slice(to + 4);
}

function minutesUntil(iso: string, now: Date): number {
  return Math.max(0, Math.round((Date.parse(iso) - now.getTime()) / 60_000));
}

function brief(departure: Departure, now: Date) {
  const due = departure.expectedAt ?? departure.scheduledAt;
  const cancelled = departure.status === 'cancelled';
  return {
    route: departure.routeName ?? departure.routeId,
    to: destination(departure.headsign),
    due: aucklandClock.format(new Date(due)),
    minutesAway: cancelled ? null : minutesUntil(due, now),
    scheduled: aucklandClock.format(new Date(departure.scheduledAt)),
    // unknown means the service is in the timetable but has not reported yet.
    status: departure.status,
    delayMinutes:
      cancelled || departure.delaySeconds === null ? null : Math.round(departure.delaySeconds / 60),
  };
}

export interface DeparturesToolOptions {
  stops: StopBoard;
  now: () => Date;
}

// The tool the assistant has only when a timetable is loaded.
export function departuresTool({ stops, now }: DeparturesToolOptions): AssistantTool {
  return defineTool({
    name: 'get_departures',
    description: `The services due at one stop in the next hour, soonest first, at most ${MAX_DEPARTURES}. Each has the time it is due, the minutes until then, the timetable's time, and how late it is running. A status of unknown means the service has not reported yet, so its due time is the timetable's time. Give the stop as words from its name or as the number on its pole. When several stops match, the result lists them and no departures: ask the rider which one, or call again with the stop number.`,
    input: z.strictObject({
      stop: z
        .string()
        .min(1)
        .max(50)
        .describe('Words from the stop name, such as Albany Station, or the stop number'),
      route: z
        .string()
        .max(50)
        .optional()
        .describe('Only routes whose name starts with this, such as 70 or NX'),
    }),
    run: ({ stop, route }, { snapshot }) => {
      const matches = stops.search(stop, MAX_STOPS);
      const exact = matches.find((match) => match.code === stop.trim());
      const chosen = exact ?? (matches.length === 1 ? matches[0] : undefined);
      if (matches.length === 0) {
        return {
          result: { note: 'No stop has this name or number.' },
          summary: 'no stop found',
        };
      }
      if (chosen === undefined) {
        return {
          result: {
            note: 'Several stops match. No departures were looked up.',
            stops: matches.map(({ name, code }) => ({ name, number: code })),
          },
          summary: `${matches.length} stops match`,
        };
      }
      const at = now();
      const departures = stops.departures(chosen.stopId, snapshot, {
        routePrefix: route,
        limit: MAX_DEPARTURES,
      });
      return {
        result: {
          stop: { name: chosen.name, number: chosen.code },
          departures: departures.map((departure) => brief(departure, at)),
        },
        summary: departures.length === 1 ? '1 departure' : `${departures.length} departures`,
      };
    },
  });
}
