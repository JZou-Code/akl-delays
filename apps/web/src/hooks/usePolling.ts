import { useEffect, useState } from 'react';

export const DEFAULT_INTERVAL_MS = 30_000;

export type Load<T> = (signal: AbortSignal) => Promise<T>;

export interface Polling<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

interface Held<T> extends Polling<T> {
  load: Load<T>;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

// A new load function starts over with no data, so callers keep it stable with useCallback.
export function usePolling<T>(load: Load<T>, intervalMs = DEFAULT_INTERVAL_MS): Polling<T> {
  const [held, setHeld] = useState<Held<T>>({
    load,
    data: undefined,
    error: undefined,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll(): Promise<void> {
      try {
        const data = await load(controller.signal);
        if (controller.signal.aborted) return;
        setHeld({ load, data, error: undefined, loading: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        setHeld((last) => ({
          load,
          data: last.load === load ? last.data : undefined,
          error: asError(error),
          loading: false,
        }));
      }
      timer = setTimeout(pollAgain, intervalMs);
    }

    function pollAgain(): void {
      setHeld((last) => ({ ...last, loading: true }));
      void poll();
    }

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [load, intervalMs]);

  if (held.load !== load) return { data: undefined, error: undefined, loading: true };
  return { data: held.data, error: held.error, loading: held.loading };
}
