import type { Feed, TripUpdate } from './schema.ts';

export interface TripDelay {
  tripId: string;
  routeId: string;
  delaySeconds: number | null;
  cancelled: boolean;
  stopId: string | null;
  vehicleId: string | null;
  updatedAt: string | null;
}

function isoFromSeconds(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

export function feedTimestamp(feed: Feed): string {
  return isoFromSeconds(feed.header.timestamp);
}

function toTripDelay(update: TripUpdate): TripDelay {
  // Stop time updates come in stop order; the first is taken as the trip's current stop.
  const stop = update.stop_time_update[0];
  return {
    tripId: update.trip.trip_id,
    routeId: update.trip.route_id,
    delaySeconds: update.delay ?? stop?.arrival?.delay ?? stop?.departure?.delay ?? null,
    cancelled: update.trip.schedule_relationship === 'CANCELED',
    stopId: stop?.stop_id ?? null,
    // The AT feed sometimes gives a vehicle with an empty id.
    vehicleId: update.vehicle?.id || null,
    updatedAt: update.timestamp === undefined ? null : isoFromSeconds(update.timestamp),
  };
}

export function toTripDelays(feed: Feed): TripDelay[] {
  return feed.entity.flatMap((entity) =>
    entity.is_deleted === true || entity.trip_update === undefined
      ? []
      : [toTripDelay(entity.trip_update)],
  );
}
