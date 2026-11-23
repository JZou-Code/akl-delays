import { z } from 'zod';
import { FeedError } from './errors.ts';

const posixSeconds = z.number().int().nonnegative();

const headerSchema = z.object({
  // The AT feed gives the header time with milliseconds, such as 1795470709.552.
  timestamp: z.number().nonnegative(),
  gtfs_realtime_version: z.string(),
  incrementality: z.union([z.string(), z.number()]).optional(),
});

const TRIP_SCHEDULE_NAMES: Readonly<Record<number, string>> = {
  0: 'SCHEDULED',
  1: 'ADDED',
  2: 'UNSCHEDULED',
  3: 'CANCELED',
  5: 'REPLACEMENT',
  6: 'DUPLICATED',
  7: 'DELETED',
};

const STOP_SCHEDULE_NAMES: Readonly<Record<number, string>> = {
  0: 'SCHEDULED',
  1: 'SKIPPED',
  2: 'NO_DATA',
  3: 'UNSCHEDULED',
};

// GTFS Realtime JSON may give an enum value as its name or as its number.
function enumName(names: Readonly<Record<number, string>>) {
  return z
    .union([z.string(), z.number().int()])
    .transform((value) => (typeof value === 'string' ? value : (names[value] ?? String(value))));
}

function asList<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const stopTimeEventSchema = z.object({
  delay: z.number().optional(),
  time: posixSeconds.optional(),
});

const stopTimeUpdateSchema = z.object({
  stop_sequence: z.number().int().nonnegative().optional(),
  stop_id: z.string().optional(),
  arrival: stopTimeEventSchema.optional(),
  departure: stopTimeEventSchema.optional(),
  schedule_relationship: enumName(STOP_SCHEDULE_NAMES).optional(),
});

const tripUpdateSchema = z.object({
  trip: z.object({
    trip_id: z.string(),
    route_id: z.string(),
    direction_id: z.number().int().optional(),
    start_time: z.string().optional(),
    start_date: z.string().optional(),
    schedule_relationship: enumName(TRIP_SCHEDULE_NAMES).optional(),
  }),
  // The GTFS spec says a list, but the AT feed may send a single object.
  stop_time_update: z
    .union([stopTimeUpdateSchema, z.array(stopTimeUpdateSchema)])
    .optional()
    .transform(asList),
  vehicle: z.object({ id: z.string().optional(), label: z.string().optional() }).optional(),
  timestamp: posixSeconds.optional(),
  delay: z.number().optional(),
});

const entitySchema = z.object({
  id: z.string(),
  is_deleted: z.boolean().optional(),
  trip_update: tripUpdateSchema.optional(),
});

const feedSchema = z.object({
  status: z.literal('OK'),
  response: z.object({
    header: headerSchema,
    // An empty GTFS Realtime feed in JSON may leave out the entity list.
    entity: z.array(entitySchema).default([]),
  }),
});

export type Feed = z.output<typeof feedSchema>['response'];
export type TripUpdate = z.output<typeof tripUpdateSchema>;

const MAX_ISSUES_SHOWN = 3;

function describeIssues(issues: z.ZodError['issues']): string {
  const shown = issues
    .slice(0, MAX_ISSUES_SHOWN)
    .map((issue) => `${issue.path.map(String).join('.') || 'body'}: ${issue.message}`);
  const hidden = issues.length - shown.length;
  return hidden > 0 ? `${shown.join('; ')}; and ${hidden} more` : shown.join('; ');
}

export function parseFeed(body: unknown): Feed {
  const result = feedSchema.safeParse(body);
  if (!result.success) {
    throw new FeedError(`feed does not match the schema: ${describeIssues(result.error.issues)}`);
  }
  return result.data.response;
}
