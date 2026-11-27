import { useEffect, useId, useState, type ReactElement } from 'react';

export const SEARCH_DELAY_MS = 300;

export interface SearchBoxProps {
  label: string;
  name: string;
  value: string;
  onChange: (text: string) => void;
}

// Reports the text once typing has stopped for SEARCH_DELAY_MS, so each key press is not a request.
export function SearchBox({ label, name, value, onChange }: SearchBoxProps): ReactElement {
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
    <div className={`filter-${name}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
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
