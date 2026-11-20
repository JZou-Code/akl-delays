import type { RouteDetail } from '@akl-delays/shared';
import { useCallback } from 'react';
import { getRoute, useFetch } from '../../api/index.ts';
import { usePolling, type Polling } from '../../hooks/index.ts';

export function useRoute(routeId: string): Polling<RouteDetail> {
  const fetch = useFetch();
  const load = useCallback(
    (signal: AbortSignal) => getRoute(routeId, { fetch, signal }),
    [fetch, routeId],
  );
  return usePolling(load);
}
