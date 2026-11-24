import { describe, expect, it } from 'vitest';
import { applyTheme, readTheme, saveTheme, THEME_KEY, toThemeChoice } from './theme.ts';

function brokenStorage(): Storage {
  const fail = () => {
    throw new Error('storage is blocked');
  };
  return { getItem: fail, setItem: fail, removeItem: fail, clear: fail, key: fail, length: 0 };
}

describe('toThemeChoice', () => {
  it('keeps light and dark', () => {
    expect(toThemeChoice('light')).toBe('light');
    expect(toThemeChoice('dark')).toBe('dark');
  });

  it('reads anything else as system', () => {
    expect(toThemeChoice(null)).toBe('system');
    expect(toThemeChoice('blue')).toBe('system');
  });
});

describe('readTheme and saveTheme', () => {
  it('reads back a saved choice', () => {
    localStorage.clear();
    saveTheme(localStorage, 'dark');

    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(readTheme(localStorage)).toBe('dark');
  });

  it('removes the entry for system', () => {
    localStorage.setItem(THEME_KEY, 'light');

    saveTheme(localStorage, 'system');

    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('reads system when storage throws, and saving does not throw', () => {
    expect(readTheme(brokenStorage())).toBe('system');
    expect(() => {
      saveTheme(brokenStorage(), 'dark');
    }).not.toThrow();
  });
});

describe('applyTheme', () => {
  it('sets data-theme for light and dark and removes it for system', () => {
    const root = document.createElement('html');

    applyTheme(root, 'dark');
    expect(root.dataset.theme).toBe('dark');

    applyTheme(root, 'system');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});
