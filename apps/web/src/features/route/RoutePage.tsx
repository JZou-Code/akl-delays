import type { ReactElement } from 'react';
import { useParams } from 'react-router';
import { bannerState, StatusBanner } from '../../components/index.ts';
import { FeedTime, useSummary } from '../summary/index.ts';
import { RouteSection } from './RouteSection.tsx';
import { useRoute } from './useRoute.ts';

export function RoutePage(): ReactElement {
  const { routeId = '' } = useParams();
  const summary = useSummary();
  const route = useRoute(routeId);
  return (
    <>
      <StatusBanner {...bannerState(summary, route)} />
      {summary.data !== undefined && (
        <FeedTime feedTimestamp={summary.data.feedTimestamp} fetchedAt={summary.data.fetchedAt} />
      )}
      <RouteSection routeId={routeId} route={route} />
    </>
  );
}
