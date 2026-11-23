import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useSort } from './useSort.ts';

function setup(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const [sort, sortBy] = useSort();
      return { sort, sortBy, search: useLocation().search };
    },
    { wrapper },
  );
}

describe('useSort', () => {
  it('reads the sort from the URL', () => {
    const { result } = setup('/?sort=route&order=desc');

    expect(result.current.sort).toEqual({ key: 'route', order: 'desc' });
  });

  it('writes a new column to the URL and keeps the filters', () => {
    const { result } = setup('/?mode=train');

    act(() => {
      result.current.sortBy('stop');
    });

    expect(result.current.search).toBe('?mode=train&sort=stop&order=asc');
    expect(result.current.sort).toEqual({ key: 'stop', order: 'asc' });
  });

  it('turns the order around when the same column is chosen again', () => {
    const { result } = setup('/?sort=stop&order=asc');

    act(() => {
      result.current.sortBy('stop');
    });

    expect(result.current.search).toBe('?sort=stop&order=desc');
  });

  it('takes the sort out of the URL when it is back to worst delay first', () => {
    const { result } = setup('/?sort=stop&order=asc');

    act(() => {
      result.current.sortBy('delay');
    });

    expect(result.current.search).toBe('');
  });
});
