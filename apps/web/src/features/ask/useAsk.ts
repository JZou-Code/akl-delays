import type { AskResponse } from '@akl-delays/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ask, useFetch } from '../../api/index.ts';

export type AskState =
  | { status: 'idle' }
  | { status: 'asking'; question: string }
  | { status: 'answered'; question: string; response: AskResponse }
  | { status: 'failed'; question: string; error: Error };

export type Ask = (question: string) => void;

// A new question drops the one still waiting for its answer.
export function useAsk(): [AskState, Ask] {
  const fetch = useFetch();
  const [state, setState] = useState<AskState>({ status: 'idle' });
  const pending = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      pending.current?.abort();
    },
    [],
  );

  const send = useCallback<Ask>(
    (question) => {
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      setState({ status: 'asking', question });
      ask(question, { fetch, signal: controller.signal }).then(
        (response) => {
          if (!controller.signal.aborted) setState({ status: 'answered', question, response });
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            status: 'failed',
            question,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        },
      );
    },
    [fetch],
  );

  return [state, send];
}
