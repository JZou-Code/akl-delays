import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PAGE_ROWS, useRows } from './useRows.ts';

function setup() {
  return renderHook(({ key }) => useRows(key), { initialProps: { key: 'mode=bus' } });
}

describe('useRows', () => {
  it('starts at one page of rows', () => {
    expect(setup().result.current[0]).toBe(PAGE_ROWS);
  });

  it('adds a page each time more is asked for', () => {
    const { result } = setup();

    act(() => {
      result.current[1]();
    });
    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(PAGE_ROWS * 3);
  });

  it('goes back to one page when the key changes', () => {
    const { result, rerender } = setup();
    act(() => {
      result.current[1]();
    });

    rerender({ key: 'mode=train' });

    expect(result.current[0]).toBe(PAGE_ROWS);
  });

  it('keeps its rows when it renders again with the same key', () => {
    const { result, rerender } = setup();
    act(() => {
      result.current[1]();
    });

    rerender({ key: 'mode=bus' });

    expect(result.current[0]).toBe(PAGE_ROWS * 2);
  });
});
