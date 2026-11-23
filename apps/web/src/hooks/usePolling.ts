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

export interface PollingOptions {
  intervalMs?: number;
  // Keeps the data of the last load function on screen until the new one answers.
  keepLastData?: boolean;
}

// A new load function starts over with no data unless keepLastData is set, so callers keep it stable with useCallback.
export function usePolling<T>(load: Load<T>, options: PollingOptions = {}): Polling<T> {
  const { intervalMs = DEFAULT_INTERVAL_MS, keepLastData = false } = options;
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
          data: last.load === load || keepLastData ? last.data : undefined,
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
  }, [load, intervalMs, keepLastData]);

  if (held.load !== load) {
    return { data: keepLastData ? held.data : undefined, error: undefined, loading: true };
  }
  return { data: held.data, error: held.error, loading: held.loading };
}
