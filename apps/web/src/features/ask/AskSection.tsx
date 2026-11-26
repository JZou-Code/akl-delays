import type { ReactElement } from 'react';
import { failureReason } from '../../api/index.ts';
import { AskAnswer } from './AskAnswer.tsx';
import { AskForm } from './AskForm.tsx';
import { useAsk, type AskState } from './useAsk.ts';
import { useAssistant } from './useAssistant.ts';

function AskResult({ state }: { state: AskState }): ReactElement | null {
  if (state.status === 'asking') {
    return (
      <p className="notice" role="status">
        Asking.
      </p>
    );
  }
  if (state.status === 'failed') {
    return (
      <p className="notice" role="alert">
        Could not get an answer ({failureReason(state.error)}).
      </p>
    );
  }
  if (state.status === 'answered') return <AskAnswer response={state.response} />;
  return null;
}

// Shows nothing unless the API has a key for the model.
export function AskSection(): ReactElement | null {
  const on = useAssistant();
  const [state, ask] = useAsk();
  if (!on) return null;
  return (
    <section className="ask">
      <h2>Ask about the board</h2>
      <AskForm asking={state.status === 'asking'} onAsk={ask} />
      <div aria-live="polite">
        <AskResult state={state} />
      </div>
    </section>
  );
}
