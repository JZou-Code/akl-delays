import type { AskResponse, AskStep } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { formatClock } from '../../components/index.ts';

function inputText(input: AskStep['input']): string {
  const entries = Object.entries(input);
  if (entries.length === 0) return 'no input';
  return entries.map(([name, value]) => `${name}: ${JSON.stringify(value)}`).join(', ');
}

export function AskAnswer({ response }: { response: AskResponse }): ReactElement {
  const { answer, steps, model, usage, feedTimestamp } = response;
  return (
    <div className="ask-answer">
      <p>{answer}</p>
      {steps.length > 0 && (
        <>
          <h3>What the model looked up</h3>
          <ol>
            {steps.map((step, index) => (
              <li key={index}>
                <code>{step.tool}</code> ({inputText(step.input)}): {step.summary}
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="ask-source">
        Written by the AI model {model} from the feed at {formatClock(feedTimestamp)}. It can be
        wrong. {usage.inputTokens.toLocaleString('en-NZ')} tokens in,{' '}
        {usage.outputTokens.toLocaleString('en-NZ')} out.
      </p>
    </div>
  );
}
