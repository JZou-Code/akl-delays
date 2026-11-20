import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePolling, type Load } from './usePolling.ts';

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function never(): Promise<string> {
  return new Promise<string>(() => undefined);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePolling', () => {
  it('is loading until the first answer, then gives the data', async () => {
    const answer = Promise.withResolvers<string>();
    const load = vi.fn<Load<string>>(() => answer.promise);
    const { result } = renderHook(() => usePolling(load));

    expect(result.current).toEqual({ data: undefined, error: undefined, loading: true });

    answer.resolve('first');
    await advance(0);

    expect(result.current).toEqual({ data: 'first', error: undefined, loading: false });
  });

  it('asks again every 30 seconds by default', async () => {
    let count = 0;
    const load = vi.fn<Load<number>>(() => Promise.resolve(++count));
    const { result } = renderHook(() => usePolling(load));
    await advance(0);

    await advance(29_999);
    expect(load).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe(2);
  });

  it('uses the interval it is given', async () => {
    const load = vi.fn<Load<string>>(() => Promise.resolve('data'));
    renderHook(() => usePolling(load, 5_000));
    await advance(0);

    await advance(5_000);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('is loading while a later request is in flight and keeps the data', async () => {
    const load = vi.fn<Load<string>>().mockResolvedValueOnce('first').mockImplementation(never);
    const { result } = renderHook(() => usePolling(load));
    await advance(0);

    await advance(30_000);

    expect(result.current).toEqual({ data: 'first', error: undefined, loading: true });
  });

  it('keeps the last good data when a later request fails', async () => {
    const load = vi
      .fn<Load<string>>()
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(new Error('the API answered HTTP 502'));
    const { result } = renderHook(() => usePolling(load));
    await advance(0);

    await advance(30_000);

    expect(result.current).toEqual({
      data: 'first',
      error: new Error('the API answered HTTP 502'),
      loading: false,
    });
  });

  it('clears the error when a request succeeds again', async () => {
    const load = vi
      .fn<Load<string>>()
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce('third');
    const { result } = renderHook(() => usePolling(load));
    await advance(0);
    await advance(30_000);

    await advance(30_000);

    expect(result.current).toEqual({ data: 'third', error: undefined, loading: false });
  });

  it('gives the error and no data when the first request fails', async () => {
    const load = vi.fn<Load<string>>().mockRejectedValueOnce(new Error('no feed data yet'));
    const { result } = renderHook(() => usePolling(load));

    await advance(0);

    expect(result.current).toEqual({
      data: undefined,
      error: new Error('no feed data yet'),
      loading: false,
    });
  });

  it('keeps polling after a failure', async () => {
    const load = vi
      .fn<Load<string>>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce('back');
    const { result } = renderHook(() => usePolling(load));
    await advance(0);

    await advance(30_000);

    expect(result.current.data).toBe('back');
  });

  it('turns a rejection that is not an Error into one', async () => {
    const load = vi.fn<Load<string>>().mockRejectedValueOnce('down');
    const { result } = renderHook(() => usePolling(load));

    await advance(0);

    expect(result.current.error).toEqual(new Error('down'));
  });

  it('does not start a request while one is in flight', async () => {
    const answer = Promise.withResolvers<string>();
    const load = vi
      .fn<Load<string>>()
      .mockReturnValueOnce(answer.promise)
      .mockResolvedValue('second');
    renderHook(() => usePolling(load));

    await advance(120_000);
    expect(load).toHaveBeenCalledTimes(1);

    answer.resolve('first');
    await advance(0);
    await advance(30_000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('aborts the request in flight on unmount', () => {
    const load = vi.fn<Load<string>>(never);
    const { unmount } = renderHook(() => usePolling(load));
    const signal = load.mock.calls[0]?.[0];

    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('does not poll again after unmount', async () => {
    const load = vi.fn<Load<string>>(() => Promise.resolve('data'));
    const { unmount } = renderHook(() => usePolling(load));
    await advance(0);

    unmount();
    await advance(120_000);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not poll again when an answer arrives after unmount', async () => {
    const answer = Promise.withResolvers<string>();
    const load = vi.fn<Load<string>>(() => answer.promise);
    const { unmount } = renderHook(() => usePolling(load));

    unmount();
    answer.resolve('late');
    await advance(120_000);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('starts over when the load function changes', async () => {
    const first = vi.fn<Load<string>>(() => Promise.resolve('bus'));
    const second = vi.fn<Load<string>>(never);
    const { result, rerender } = renderHook(({ load }) => usePolling(load), {
      initialProps: { load: first },
    });
    await advance(0);
    const firstSignal = first.mock.calls[0]?.[0];

    rerender({ load: second });

    expect(result.current).toEqual({ data: undefined, error: undefined, loading: true });
    expect(second).toHaveBeenCalledTimes(1);
    expect(firstSignal?.aborted).toBe(true);
    await advance(30_000);
    expect(first).toHaveBeenCalledTimes(1);
  });
});
