import type { TripDelay } from './trip-delay.ts';

// Age is measured against the feed's own time, not the clock, so a recorded feed gives the same result on any day.
export function dropStale(
  trips: readonly TripDelay[],
  feedTime: string,
  maxAgeSeconds: number,
): TripDelay[] {
  const oldest = Date.parse(feedTime) - maxAgeSeconds * 1000;
  return trips.filter((trip) => trip.updatedAt === null || Date.parse(trip.updatedAt) >= oldest);
}
