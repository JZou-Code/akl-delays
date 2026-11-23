import { useEffect, useId, useState, type ReactElement } from 'react';

export const SEARCH_DELAY_MS = 300;

export interface SearchBoxProps {
  value: string;
  onChange: (text: string) => void;
}

// Reports the text once typing has stopped for SEARCH_DELAY_MS, so each key press is not a request.
export function SearchBox({ value, onChange }: SearchBoxProps): ReactElement {
  const id = useId();
  const [text, setText] = useState(value);

  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => {
      onChange(text);
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, value, onChange]);

  return (
    <div>
      <label htmlFor={id}>Route or stop</label>
      <input
        id={id}
        name="q"
        type="search"
        maxLength={50}
        autoComplete="off"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
    </div>
  );
}
