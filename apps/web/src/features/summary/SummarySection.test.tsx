import type { Summary } from '@akl-delays/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/index.ts';
import type { Polling } from '../../hooks/index.ts';
import { SummarySection } from './SummarySection.tsx';

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

const summary: Summary = {
  feedTimestamp: '2026-11-19T19:00:00.000Z',
  fetchedAt: '2026-11-19T19:00:05.000Z',
  stale: false,
  modes: { bus: { ...zero, late: 1, total: 1 }, train: zero, ferry: zero },
};

function polling(state: Partial<Polling<Summary>>): Polling<Summary> {
  return { data: undefined, error: undefined, loading: false, ...state };
}

describe('SummarySection', () => {
  it('says it is loading before the first answer', () => {
    render(<SummarySection summary={polling({ loading: true })} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says it is waiting when the API has no data yet', () => {
    const error = new ApiRequestError(503, 'no feed data yet');

    render(<SummarySection summary={polling({ error })} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Waiting for the first data from the feed.',
    );
  });

  it('shows the feed time and the counts', () => {
    render(<SummarySection summary={polling({ data: summary })} />);

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText(/^Feed time/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Services by status and mode' })).toBeInTheDocument();
  });

  it('keeps showing the counts when a later request fails', () => {
    const error = new ApiRequestError(502, 'the API answered HTTP 502');

    render(<SummarySection summary={polling({ data: summary, error })} />);

    expect(screen.getByRole('table', { name: 'Services by status and mode' })).toBeInTheDocument();
  });
});
