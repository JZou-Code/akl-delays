import type { ServiceDelay } from '@akl-delays/shared';
import { useCallback } from 'react';
import { getDelays, useFetch, type DelaysQuery } from '../../api/index.ts';
import { usePolling, type Polling } from '../../hooks/index.ts';

export function useDelays({ mode, status, limit }: DelaysQuery): Polling<ServiceDelay[]> {
  const fetch = useFetch();
  const load = useCallback(
    (signal: AbortSignal) => getDelays({ mode, status, limit }, { fetch, signal }),
    [fetch, mode, status, limit],
  );
  return usePolling(load);
}
