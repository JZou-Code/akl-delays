import type { ServiceDelay } from '@akl-delays/shared';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FetchProvider, type DelaysQuery, type Fetch } from '../../api/index.ts';
import { useDelays } from './useDelays.ts';

const service: ServiceDelay = {
  tripId: 'nx1-0715-1',
  routeId: 'NX1-901',
  routeName: 'NX1',
  mode: 'bus',
  delaySeconds: 480,
  status: 'late',
  stopId: '4002-901',
  stopName: 'Constellation Station',
  vehicleId: '51101',
  updatedAt: '2026-11-19T18:59:48.000Z',
};

function setup(initialProps: DelaysQuery) {
  const fetch = vi.fn<Fetch>(() => Promise.resolve(Response.json([service])));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <FetchProvider fetch={fetch}>{children}</FetchProvider>
  );
  const hook = renderHook((query: DelaysQuery) => useDelays(query), { wrapper, initialProps });
  return { fetch, ...hook };
}

describe('useDelays', () => {
  it('loads the services for the query', async () => {
    const { fetch, result } = setup({ mode: 'bus' });

    await waitFor(() => {
      expect(result.current.data).toEqual([service]);
    });
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/delays?mode=bus');
  });

  it('asks again at once when the query changes', async () => {
    const { fetch, result, rerender } = setup({});
    await waitFor(() => {
      expect(result.current.data).toEqual([service]);
    });

    rerender({ status: 'late' });

    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/delays',
      '/api/delays?status=late',
    ]);
  });

  it('does not ask again when it renders with the same query', async () => {
    const { fetch, result, rerender } = setup({ mode: 'train' });
    await waitFor(() => {
      expect(result.current.data).toEqual([service]);
    });

    rerender({ mode: 'train' });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
