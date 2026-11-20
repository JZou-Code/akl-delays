import type { RouteDetail } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { isNotFound } from '../../api/index.ts';
import { LoadNotice, modeLabel } from '../../components/index.ts';
import type { Polling } from '../../hooks/index.ts';
import { RouteServices } from './RouteServices.tsx';

export interface RouteSectionProps {
  routeId: string;
  route: Polling<RouteDetail>;
}

function runningText({ mode, services }: RouteDetail): string {
  const count = services.length === 1 ? '1 service' : `${services.length} services`;
  return `${modeLabel(mode)}, ${count} running now.`;
}

export function RouteSection({ routeId, route }: RouteSectionProps): ReactElement {
  const { data, error } = route;

  if (isNotFound(error)) {
    return (
      <section className="route">
        <h2>Route {routeId}</h2>
        <p className="notice">No services are running on this route right now.</p>
        <p>
          <Link to="/">Back to the board</Link>
        </p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="route">
        <h2>Route {routeId}</h2>
        <LoadNotice loading={route.loading} error={error} />
      </section>
    );
  }

  return (
    <section className="route">
      <h2>Route {data.routeName ?? data.routeId}</h2>
      <p>{runningText(data)}</p>
      <RouteServices services={data.services} />
    </section>
  );
}
