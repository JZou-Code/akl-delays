import type { Mode, ServiceDelay } from '@akl-delays/shared';
import { delayStatus } from './status.ts';

export interface TripInput {
  tripId: string;
  routeId: string;
  delaySeconds: number | null;
  cancelled: boolean;
  stopId: string | null;
  vehicleId: string | null;
  updatedAt: string | null;
}

export interface Lookups {
  route: (routeId: string) => { name: string | null; mode: Mode | null } | undefined;
  stop: (stopId: string) => { name: string | null } | undefined;
}

export function toServiceDelay(trip: TripInput, lookups: Lookups): ServiceDelay {
  const route = lookups.route(trip.routeId);
  const stop = trip.stopId === null ? undefined : lookups.stop(trip.stopId);
  return {
    tripId: trip.tripId,
    routeId: trip.routeId,
    routeName: route?.name ?? null,
    mode: route?.mode ?? null,
    delaySeconds: trip.delaySeconds,
    status: delayStatus(trip),
    stopId: trip.stopId,
    stopName: stop?.name ?? null,
    vehicleId: trip.vehicleId,
    updatedAt: trip.updatedAt,
  };
}
