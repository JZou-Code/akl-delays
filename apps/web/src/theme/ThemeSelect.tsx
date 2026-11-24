import { useId, type ReactElement } from 'react';
import { THEME_CHOICES, themeLabel, toThemeChoice } from './theme.ts';
import { useTheme } from './useTheme.ts';

export function ThemeSelect(): ReactElement {
  const id = useId();
  const [choice, choose] = useTheme();
  return (
    <div className="theme">
      <label htmlFor={id}>Theme</label>
      <select
        id={id}
        value={choice}
        onChange={(event) => {
          choose(toThemeChoice(event.target.value));
        }}
      >
        {THEME_CHOICES.map((option) => (
          <option key={option} value={option}>
            {themeLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}
