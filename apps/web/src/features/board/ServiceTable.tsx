import type { ServiceDelay } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { formatDelay, modeLabel, StatusBadge } from '../../components/index.ts';
import { routePath } from '../route/index.ts';

export function ServiceTable({ services }: { services: readonly ServiceDelay[] }): ReactElement {
  return (
    <table className="services">
      <caption>Services, worst delay first</caption>
      <thead>
        <tr>
          <th scope="col">Route</th>
          <th scope="col">Mode</th>
          <th scope="col">Status</th>
          <th scope="col">Delay</th>
          <th scope="col">Stop</th>
        </tr>
      </thead>
      <tbody>
        {services.map((service) => (
          <tr key={service.tripId}>
            <th scope="row">
              <Link to={routePath(service.routeId)}>{service.routeName ?? service.routeId}</Link>
            </th>
            <td>{modeLabel(service.mode)}</td>
            <td>
              <StatusBadge status={service.status} />
            </td>
            <td>{formatDelay(service.delaySeconds, service.status)}</td>
            <td className="stop">{service.stopName ?? service.stopId ?? 'Unknown'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
