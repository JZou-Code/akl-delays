import type { ServiceDelay } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { formatDelay, StatusBadge } from '../../components/index.ts';

export function RouteServices({ services }: { services: readonly ServiceDelay[] }): ReactElement {
  return (
    <table className="services">
      <caption>Services on this route, worst delay first</caption>
      <thead>
        <tr>
          <th scope="col">Status</th>
          <th scope="col">Delay</th>
          <th scope="col">Stop</th>
          <th scope="col">Vehicle</th>
        </tr>
      </thead>
      <tbody>
        {services.map((service) => (
          <tr key={service.tripId}>
            <td>
              <StatusBadge status={service.status} />
            </td>
            <td className="delay">{formatDelay(service.delaySeconds, service.status)}</td>
            <td className="stop">{service.stopName ?? service.stopId ?? 'Unknown'}</td>
            <td>{service.vehicleId ?? 'Unknown'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
