import type { ReactElement } from 'react';
import { useParams } from 'react-router';
import { RouteSection } from './RouteSection.tsx';
import { useRoute } from './useRoute.ts';

export function RoutePage(): ReactElement {
  const { routeId = '' } = useParams();
  const route = useRoute(routeId);
  return <RouteSection routeId={routeId} route={route} />;
}
