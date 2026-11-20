import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useFilters } from './useFilters.ts';

function setup(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const [filters, setFilter] = useFilters();
      return { filters, setFilter, search: useLocation().search };
    },
    { wrapper },
  );
}

describe('useFilters', () => {
  it('reads the filters from the URL', () => {
    const { result } = setup('/?mode=train&status=late');

    expect(result.current.filters).toEqual({ mode: 'train', status: 'late' });
  });

  it('writes a changed filter to the URL', () => {
    const { result } = setup('/?mode=train');

    act(() => {
      result.current.setFilter('status', 'cancelled');
    });

    expect(result.current.search).toBe('?mode=train&status=cancelled');
    expect(result.current.filters).toEqual({ mode: 'train', status: 'cancelled' });
  });

  it('takes a filter out of the URL when it is set back to all', () => {
    const { result } = setup('/?mode=train&status=late');

    act(() => {
      result.current.setFilter('mode', '');
    });

    expect(result.current.search).toBe('?status=late');
  });
});
