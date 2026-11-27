import type { AskResponse } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { formatClock } from '../../components/index.ts';
import { describeStep } from './describe-step.ts';

export function AskAnswer({ response }: { response: AskResponse }): ReactElement {
  const { answer, steps, model, usage, feedSource, feedTimestamp } = response;
  const from =
    feedSource === 'at'
      ? `the live feed at ${formatClock(feedTimestamp)}`
      : 'recorded sample data, not the live feed';
  return (
    <div className="ask-answer">
      <p>{answer}</p>
      {steps.length > 0 && (
        <>
          <h3>What the model looked up</h3>
          <ol>
            {steps.map((step, index) => (
              <li key={index}>
                {describeStep(step)}. Found {step.summary}.
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="ask-source">
        Written by the AI model {model} from {from}. It can be wrong.{' '}
        {usage.inputTokens.toLocaleString('en-NZ')} tokens in,{' '}
        {usage.outputTokens.toLocaleString('en-NZ')} out.
      </p>
    </div>
  );
}
