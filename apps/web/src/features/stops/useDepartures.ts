import type { StopDepartures } from '@akl-delays/shared';
import { useCallback } from 'react';
import { getDepartures, useFetch } from '../../api/index.ts';
import { usePolling, type Polling } from '../../hooks/index.ts';

export function useDepartures(stopId: string, route: string): Polling<StopDepartures> {
  const fetch = useFetch();
  const load = useCallback(
    (signal: AbortSignal) => getDepartures(stopId, route, { fetch, signal }),
    [fetch, stopId, route],
  );
  return usePolling(load, { keepLastData: true });
}
