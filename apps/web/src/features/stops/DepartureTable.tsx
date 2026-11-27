import type { Departure } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { formatDelay, formatTime, formatWait, StatusBadge } from '../../components/index.ts';
import { routePath } from '../route/index.ts';
import { destination } from './destination.ts';

export interface DepartureTableProps {
  departures: readonly Departure[];
  now: Date;
}

// The expected time when the service has reported, the timetable's time when it has not.
function dueAt(departure: Departure): string {
  return departure.expectedAt ?? departure.scheduledAt;
}

function Running({ departure }: { departure: Departure }): ReactElement {
  if (!departure.live) return <span className="detail">Scheduled, no live data</span>;
  return (
    <>
      <StatusBadge status={departure.status} />
      {departure.status !== 'cancelled' && (
        <span className="detail">{formatDelay(departure.delaySeconds, departure.status)}</span>
      )}
    </>
  );
}

export function DepartureTable({ departures, now }: DepartureTableProps): ReactElement {
  return (
    <table className="services departures">
      <caption>Services due at this stop, soonest first</caption>
      <thead>
        <tr>
          <th scope="col">Route</th>
          <th scope="col">To</th>
          <th scope="col">Due</th>
          <th scope="col">Running</th>
        </tr>
      </thead>
      <tbody>
        {departures.map((departure) => (
          <tr key={`${departure.tripId} ${departure.scheduledAt}`}>
            <th scope="row">
              <Link to={routePath(departure.routeId)}>
                {departure.routeName ?? departure.routeId}
              </Link>
            </th>
            <td className="stop">{destination(departure.headsign)}</td>
            <td className="due">
              {formatTime(dueAt(departure))}
              {departure.status !== 'cancelled' && (
                <span className="detail">{formatWait(dueAt(departure), now)}</span>
              )}
            </td>
            <td className="running">
              <Running departure={departure} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
