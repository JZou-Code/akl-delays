import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Fetch } from './client.ts';
import { FetchProvider, useFetch } from './fetch-context.tsx';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFetch', () => {
  it('gives the fetch from the provider', () => {
    const fetch = vi.fn<Fetch>();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FetchProvider fetch={fetch}>{children}</FetchProvider>
    );

    const { result } = renderHook(() => useFetch(), { wrapper });

    expect(result.current).toBe(fetch);
  });

  it('calls the global fetch without a provider', async () => {
    const global = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

    const { result } = renderHook(() => useFetch());
    await result.current('/api/health');

    expect(global).toHaveBeenCalledWith('/api/health', undefined);
  });
});
