import type { DelaysPage } from '@akl-delays/shared';
import { useCallback } from 'react';
import { getDelays, useFetch, type DelaysQuery } from '../../api/index.ts';
import { usePolling, type Polling } from '../../hooks/index.ts';

export function useDelays(query: DelaysQuery): Polling<DelaysPage> {
  const { mode, status, route, stop, sort, order, limit } = query;
  const fetch = useFetch();
  const load = useCallback(
    (signal: AbortSignal) =>
      getDelays({ mode, status, route, stop, sort, order, limit }, { fetch, signal }),
    [fetch, mode, status, route, stop, sort, order, limit],
  );
  return usePolling(load, { keepLastData: true });
}
