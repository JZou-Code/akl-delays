import type { Summary } from '@akl-delays/shared';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FetchProvider, type Fetch } from '../../api/index.ts';
import { useSummary } from './useSummary.ts';

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

const summary: Summary = {
  feedTimestamp: '2026-11-19T19:00:00.000Z',
  fetchedAt: '2026-11-19T19:00:05.000Z',
  stale: false,
  modes: { bus: { ...zero, late: 1, total: 1 }, train: zero, ferry: zero },
};

describe('useSummary', () => {
  it('loads the summary with the fetch it is given', async () => {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(Response.json(summary)));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FetchProvider fetch={fetch}>{children}</FetchProvider>
    );

    const { result } = renderHook(() => useSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(summary);
    });
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/summary');
  });
});
