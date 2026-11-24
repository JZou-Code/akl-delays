import { useCallback, useState } from 'react';
import { applyTheme, readTheme, saveTheme, type ThemeChoice } from './theme.ts';

export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [choice, setChoice] = useState(() => readTheme(localStorage));
  const choose = useCallback((next: ThemeChoice) => {
    applyTheme(document.documentElement, next);
    saveTheme(localStorage, next);
    setChoice(next);
  }, []);
  return [choice, choose];
}
