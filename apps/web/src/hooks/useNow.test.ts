import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './useNow.ts';

const START = new Date('2026-11-19T19:00:05.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNow', () => {
  it('gives the time it was first rendered', () => {
    const { result } = renderHook(() => useNow());

    expect(result.current).toEqual(START);
  });

  it('moves on every second by default', () => {
    const { result } = renderHook(() => useNow());

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current).toEqual(new Date('2026-11-19T19:00:08.000Z'));
  });

  it('uses the interval it is given', () => {
    const { result } = renderHook(() => useNow(10_000));

    act(() => {
      vi.advanceTimersByTime(9_999);
    });
    expect(result.current).toEqual(START);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toEqual(new Date('2026-11-19T19:00:15.000Z'));
  });

  it('stops its timer on unmount', () => {
    const { unmount } = renderHook(() => useNow());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
