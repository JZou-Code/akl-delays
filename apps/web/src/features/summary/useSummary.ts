import type { Summary } from '@akl-delays/shared';
import { useCallback } from 'react';
import { getSummary, useFetch } from '../../api/index.ts';
import { usePolling, type Polling } from '../../hooks/index.ts';

export function useSummary(): Polling<Summary> {
  const fetch = useFetch();
  const load = useCallback((signal: AbortSignal) => getSummary({ fetch, signal }), [fetch]);
  return usePolling(load);
}
