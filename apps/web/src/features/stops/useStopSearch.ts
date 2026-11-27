import type { StopsPage } from '@akl-delays/shared';
import { useEffect, useState } from 'react';
import { searchStops, useFetch } from '../../api/index.ts';

export type StopSearchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'found'; page: StopsPage }
  | { status: 'failed'; error: Error };

interface Held {
  text: string;
  state: StopSearchState;
}

// Searches once for each text. Blank text asks nothing.
export function useStopSearch(text: string): StopSearchState {
  const fetch = useFetch();
  const wanted = text.trim();
  const [held, setHeld] = useState<Held>({ text: '', state: { status: 'idle' } });

  useEffect(() => {
    if (wanted === '') return;
    const controller = new AbortController();
    searchStops(wanted, { fetch, signal: controller.signal }).then(
      (page) => {
        if (!controller.signal.aborted) setHeld({ text: wanted, state: { status: 'found', page } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const failure = error instanceof Error ? error : new Error(String(error));
        setHeld({ text: wanted, state: { status: 'failed', error: failure } });
      },
    );
    return () => {
      controller.abort();
    };
  }, [fetch, wanted]);

  if (wanted === '') return { status: 'idle' };
  return held.text === wanted ? held.state : { status: 'searching' };
}
