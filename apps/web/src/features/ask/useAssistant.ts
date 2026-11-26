import { useEffect, useState } from 'react';
import { getHealth, useFetch } from '../../api/index.ts';

// True once the API says it can answer questions. It stays false when the API cannot be reached.
export function useAssistant(): boolean {
  const fetch = useFetch();
  const [on, setOn] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getHealth({ fetch, signal: controller.signal }).then(
      (health) => {
        if (!controller.signal.aborted) setOn(health.assistant === true);
      },
      () => undefined,
    );
    return () => {
      controller.abort();
    };
  }, [fetch]);

  return on;
}
