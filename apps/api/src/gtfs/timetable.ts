import { z } from 'zod';
import { GtfsError, parseRows } from './csv.ts';
import { weekday } from './service-day.ts';

// One trip in the timetable. The three lists run in stop order and have the same length.
export interface TimetableTrip {
  tripId: string;
  routeId: string;
  serviceId: string;
  headsign: string | null;
  stopIds: string[];
  sequences: number[];
  // Seconds after the start of the service day. They pass 86400 on a trip that runs past midnight.
  seconds: number[];
}

export interface Timetable {
  trip(tripId: string): TimetableTrip | undefined;
  tripsAt(stopId: string): readonly TimetableTrip[];
  // The service ids that run on a date written as 20261127.
  activeServices(date: string): ReadonlySet<string>;
}

export interface TimetableTexts {
  trips: string;
  calendar: string;
  calendarDates: string;
  stopTimes: string;
}

const tripRowSchema = z.object({
  trip_id: z.string({ error: 'trip_id is missing' }).min(1, 'trip_id is empty'),
  route_id: z.string({ error: 'route_id is missing' }).min(1, 'route_id is empty'),
  service_id: z.string({ error: 'service_id is missing' }).min(1, 'service_id is empty'),
  trip_headsign: z.string().optional(),
});

const DAY_COLUMNS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const dayFlag = z.enum(['0', '1'], { error: 'a day column must be 0 or 1' });
const gtfsDate = z.string().regex(/^\d{8}$/, 'a date must be 8 digits');

const calendarRowSchema = z.object({
  service_id: z.string({ error: 'service_id is missing' }).min(1, 'service_id is empty'),
  monday: dayFlag,
  tuesday: dayFlag,
  wednesday: dayFlag,
  thursday: dayFlag,
  friday: dayFlag,
  saturday: dayFlag,
  sunday: dayFlag,
  start_date: gtfsDate,
  end_date: gtfsDate,
});

const calendarDateRowSchema = z.object({
  service_id: z.string({ error: 'service_id is missing' }).min(1, 'service_id is empty'),
  date: gtfsDate,
  exception_type: z.enum(['1', '2'], { error: 'exception_type must be 1 or 2' }),
});

type CalendarRow = z.output<typeof calendarRowSchema>;
type CalendarDateRow = z.output<typeof calendarDateRowSchema>;

const STOP_TIME_COLUMNS = ['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence'];

function clockSeconds(text: string): number {
  const match = /^(\d{1,3}):(\d{2}):(\d{2})$/.exec(text);
  if (match === null) return Number.NaN;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

// stop_times.txt has over a million rows, so it is read line by line and not through the CSV parser.
// Only the first five columns are used. They hold no quotes or commas in AT's file.
function addStopTimes(text: string, trips: Map<string, TimetableTrip>): void {
  const end = text.indexOf('\n');
  const header = (end === -1 ? text : text.slice(0, end)).replace(/^\uFEFF/, '').trim();
  if (header.split(',').slice(0, 5).join(',') !== STOP_TIME_COLUMNS.join(',')) {
    throw new GtfsError(
      `stop_times.txt must start with the columns ${STOP_TIME_COLUMNS.join(',')}`,
    );
  }
  // A piece cut from the file's text keeps the whole text in memory. Each stop id is copied once.
  const stopIds = new Map<string, string>();
  let row = 0;
  let start = end + 1;
  while (end !== -1 && start < text.length) {
    let stop = text.indexOf('\n', start);
    if (stop === -1) stop = text.length;
    const line = text.slice(start, stop);
    start = stop + 1;
    if (line.trim() === '') continue;
    row += 1;
    const [tripId, , departure, stopId, sequenceText] = line.split(',', 5);
    const seconds = clockSeconds(departure ?? '');
    const sequence = Number(sequenceText);
    if (!tripId || !stopId || Number.isNaN(seconds) || !Number.isInteger(sequence)) {
      throw new GtfsError(
        `stop_times.txt row ${row}: the trip, time, stop or sequence is not valid`,
      );
    }
    // A row for a trip that trips.txt does not list is left out.
    const trip = trips.get(tripId);
    if (trip === undefined) continue;
    let ownStopId = stopIds.get(stopId);
    if (ownStopId === undefined) {
      ownStopId = Buffer.from(stopId).toString();
      stopIds.set(ownStopId, ownStopId);
    }
    trip.stopIds.push(ownStopId);
    trip.sequences.push(sequence);
    trip.seconds.push(seconds);
  }
}

function sortByStopOrder(trip: TimetableTrip): void {
  const order = trip.sequences.map((_, index) => index);
  if (order.every((index) => index === 0 || trip.sequences[index - 1]! < trip.sequences[index]!)) {
    return;
  }
  order.sort((a, b) => trip.sequences[a]! - trip.sequences[b]!);
  trip.stopIds = order.map((index) => trip.stopIds[index]!);
  trip.seconds = order.map((index) => trip.seconds[index]!);
  trip.sequences = order.map((index) => trip.sequences[index]!);
}

function servicesOn(
  date: string,
  calendar: readonly CalendarRow[],
  exceptions: readonly CalendarDateRow[],
): Set<string> {
  const day = DAY_COLUMNS[weekday(date)]!;
  const active = new Set(
    calendar
      .filter((row) => row[day] === '1' && row.start_date <= date && date <= row.end_date)
      .map((row) => row.service_id),
  );
  for (const exception of exceptions) {
    if (exception.date !== date) continue;
    if (exception.exception_type === '1') active.add(exception.service_id);
    else active.delete(exception.service_id);
  }
  return active;
}

export function parseTimetable(texts: TimetableTexts): Timetable {
  const trips = new Map<string, TimetableTrip>(
    parseRows(texts.trips, 'trips.txt', tripRowSchema).map((row) => [
      row.trip_id,
      {
        tripId: row.trip_id,
        routeId: row.route_id,
        serviceId: row.service_id,
        headsign: row.trip_headsign || null,
        stopIds: [],
        sequences: [],
        seconds: [],
      },
    ]),
  );
  addStopTimes(texts.stopTimes, trips);

  const byStop = new Map<string, TimetableTrip[]>();
  for (const trip of trips.values()) {
    sortByStopOrder(trip);
    for (const stopId of new Set(trip.stopIds)) {
      const atStop = byStop.get(stopId);
      if (atStop === undefined) byStop.set(stopId, [trip]);
      else atStop.push(trip);
    }
  }

  const calendar = parseRows(texts.calendar, 'calendar.txt', calendarRowSchema);
  const exceptions = parseRows(texts.calendarDates, 'calendar_dates.txt', calendarDateRowSchema);
  const active = new Map<string, Set<string>>();

  return {
    trip: (tripId) => trips.get(tripId),
    tripsAt: (stopId) => byStop.get(stopId) ?? [],
    activeServices: (date) => {
      let services = active.get(date);
      if (services === undefined) {
        services = servicesOn(date, calendar, exceptions);
        active.set(date, services);
      }
      return services;
    },
  };
}
