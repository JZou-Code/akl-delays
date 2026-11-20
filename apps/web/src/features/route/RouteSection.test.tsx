import type { RouteDetail, ServiceDelay } from '@akl-delays/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/index.ts';
import type { Polling } from '../../hooks/index.ts';
import { RouteSection } from './RouteSection.tsx';

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

const detail: RouteDetail = {
  routeId: 'NX1-901',
  routeName: 'NX1',
  mode: 'bus',
  services: [service, { ...service, tripId: 'nx1-0730-1' }],
};

function renderSection(state: Partial<Polling<RouteDetail>>) {
  const route = { data: undefined, error: undefined, loading: false, ...state };
  render(
    <MemoryRouter>
      <RouteSection routeId="NX1-901" route={route} />
    </MemoryRouter>,
  );
}

describe('RouteSection', () => {
  it('names the route by its id while it loads', () => {
    renderSection({ loading: true });

    expect(screen.getByRole('heading', { name: 'Route NX1-901' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading.');
  });

  it('says it is waiting when the API has no data yet', () => {
    renderSection({ error: new ApiRequestError(503, 'no feed data yet') });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Waiting for the first data from the feed.',
    );
  });

  it('shows the route name, its mode and its services', () => {
    renderSection({ data: detail });

    expect(screen.getByRole('heading', { name: 'Route NX1' })).toBeInTheDocument();
    expect(screen.getByText('Bus, 2 services running now.')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Services on this route, worst delay first' }),
    ).toBeInTheDocument();
  });

  it('says 1 service for a single service', () => {
    renderSection({ data: { ...detail, services: [service] } });

    expect(screen.getByText('Bus, 1 service running now.')).toBeInTheDocument();
  });

  it('says plainly when nothing runs on the route and links back to the board', () => {
    renderSection({ error: new ApiRequestError(404, 'no running services on this route') });

    expect(
      screen.getByText('No services are running on this route right now.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the board' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('drops the old services when the route stops running', () => {
    renderSection({
      data: detail,
      error: new ApiRequestError(404, 'no running services on this route'),
    });

    expect(
      screen.getByText('No services are running on this route right now.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('keeps the services when a later request fails for another reason', () => {
    renderSection({ data: detail, error: new ApiRequestError(502, 'the API answered HTTP 502') });

    expect(
      screen.getByRole('table', { name: 'Services on this route, worst delay first' }),
    ).toBeInTheDocument();
  });
});
