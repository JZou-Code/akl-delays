export const THEME_CHOICES = ['system', 'light', 'dark'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

// index.html reads the same key before the first paint.
export const THEME_KEY = 'theme';

const LABELS: Record<ThemeChoice, string> = { system: 'System', light: 'Light', dark: 'Dark' };

export function themeLabel(choice: ThemeChoice): string {
  return LABELS[choice];
}

export function toThemeChoice(value: string | null | undefined): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function readTheme(storage: Pick<Storage, 'getItem'>): ThemeChoice {
  try {
    return toThemeChoice(storage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

// Storage can throw, for example in a private window. The choice then lasts until the page reloads.
export function saveTheme(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  choice: ThemeChoice,
): void {
  try {
    if (choice === 'system') storage.removeItem(THEME_KEY);
    else storage.setItem(THEME_KEY, choice);
  } catch {
    return;
  }
}

export function applyTheme(root: HTMLElement, choice: ThemeChoice): void {
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
}
