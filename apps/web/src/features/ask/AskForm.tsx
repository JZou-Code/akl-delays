import { QUESTION_MAX_LENGTH } from '@akl-delays/shared';
import { useId, useState, type ReactElement, type SyntheticEvent } from 'react';

export const EXAMPLE_QUESTIONS = [
  'Which bus routes are running latest right now?',
  'Are the trains on time?',
  'Is anything cancelled?',
] as const;

export interface AskFormProps {
  asking: boolean;
  onAsk: (question: string) => void;
}

export function AskForm({ asking, onAsk }: AskFormProps): ReactElement {
  const id = useId();
  const [text, setText] = useState('');
  const question = text.trim();

  function submit(event: SyntheticEvent): void {
    event.preventDefault();
    if (question !== '' && !asking) onAsk(question);
  }

  return (
    <form className="ask-form" onSubmit={submit}>
      <label htmlFor={id}>Question</label>
      <div className="ask-row">
        <input
          id={id}
          name="question"
          type="text"
          maxLength={QUESTION_MAX_LENGTH}
          autoComplete="off"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        <button type="submit" disabled={question === '' || asking}>
          Ask
        </button>
      </div>
      <ul className="ask-examples" aria-label="Example questions">
        {EXAMPLE_QUESTIONS.map((example) => (
          <li key={example}>
            <button
              type="button"
              disabled={asking}
              onClick={() => {
                setText(example);
                onAsk(example);
              }}
            >
              {example}
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
}
