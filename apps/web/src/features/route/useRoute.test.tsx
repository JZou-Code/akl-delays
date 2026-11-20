import type { RouteDetail } from '@akl-delays/shared';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FetchProvider, type Fetch } from '../../api/index.ts';
import { useRoute } from './useRoute.ts';

const detail: RouteDetail = { routeId: 'NX1-901', routeName: 'NX1', mode: 'bus', services: [] };

describe('useRoute', () => {
  it('loads the route it is given and asks again when the route changes', async () => {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(Response.json(detail)));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FetchProvider fetch={fetch}>{children}</FetchProvider>
    );
    const { result, rerender } = renderHook((routeId: string) => useRoute(routeId), {
      wrapper,
      initialProps: 'NX1-901',
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(detail);
    });
    rerender('70-901');

    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/routes/NX1-901',
      '/api/routes/70-901',
    ]);
  });
});
