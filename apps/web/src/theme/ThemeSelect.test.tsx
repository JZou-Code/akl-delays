import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { THEME_KEY } from './theme.ts';
import { ThemeSelect } from './ThemeSelect.tsx';

function select(): HTMLElement {
  return screen.getByRole('combobox', { name: 'Theme' });
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemeSelect', () => {
  it('starts on system when nothing is saved', () => {
    render(<ThemeSelect />);

    expect(select()).toHaveValue('system');
  });

  it('starts on the saved choice', () => {
    localStorage.setItem(THEME_KEY, 'dark');

    render(<ThemeSelect />);

    expect(select()).toHaveValue('dark');
  });

  it('sets the theme on the page and saves it', () => {
    render(<ThemeSelect />);

    fireEvent.change(select(), { target: { value: 'light' } });

    expect(select()).toHaveValue('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('goes back to the system theme', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeSelect />);

    fireEvent.change(select(), { target: { value: 'system' } });

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });
});
