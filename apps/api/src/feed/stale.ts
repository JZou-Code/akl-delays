import type { TripDelay } from './trip-delay.ts';

// Age is measured against the feed's own time, not the clock, so a recorded feed gives the same result on any day.
export function dropStale(
  trips: readonly TripDelay[],
  feedTime: string,
  maxAgeSeconds: number,
): TripDelay[] {
  const oldest = Date.parse(feedTime) - maxAgeSeconds * 1000;
  // A cancelled trip gets one update, when it is cancelled, so its age says nothing. AT takes it out of the feed itself.
  return trips.filter(
    (trip) => trip.cancelled || trip.updatedAt === null || Date.parse(trip.updatedAt) >= oldest,
  );
}
