import type { ServiceDelay } from '@akl-delays/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/index.ts';
import type { Polling } from '../../hooks/index.ts';
import { BoardSection } from './BoardSection.tsx';

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

function polling(state: Partial<Polling<ServiceDelay[]>>): Polling<ServiceDelay[]> {
  return { data: undefined, error: undefined, loading: false, ...state };
}

describe('BoardSection', () => {
  it('says it is loading before the first answer', () => {
    render(<BoardSection delays={polling({ loading: true })} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading.');
  });

  it('says it is waiting when the API has no data yet', () => {
    const error = new ApiRequestError(503, 'no feed data yet');

    render(<BoardSection delays={polling({ error })} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Waiting for the first data from the feed.',
    );
  });

  it('says so when the feed has no services', () => {
    render(<BoardSection delays={polling({ data: [] })} />);

    expect(screen.getByText('The feed has no services right now.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the services', () => {
    render(<BoardSection delays={polling({ data: [service] })} />);

    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
  });

  it('keeps showing the services when a later request fails', () => {
    const error = new ApiRequestError(502, 'the API answered HTTP 502');

    render(<BoardSection delays={polling({ data: [service], error })} />);

    expect(screen.getByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
  });
});
