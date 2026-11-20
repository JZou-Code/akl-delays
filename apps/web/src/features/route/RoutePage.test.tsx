import type { RouteDetail } from '@akl-delays/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { FetchProvider, type Fetch } from '../../api/index.ts';
import { ROUTE_PATH } from './paths.ts';
import { RoutePage } from './RoutePage.tsx';

const detail: RouteDetail = {
  routeId: 'NX1-901',
  routeName: 'NX1',
  mode: 'bus',
  services: [
    {
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
    },
  ],
};

function renderPage(url: string, fetch: Fetch) {
  render(
    <FetchProvider fetch={fetch}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={ROUTE_PATH} element={<RoutePage />} />
        </Routes>
      </MemoryRouter>
    </FetchProvider>,
  );
}

describe('RoutePage', () => {
  it('loads the route named in the URL', async () => {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(Response.json(detail)));

    renderPage('/routes/NX1-901', fetch);

    expect(await screen.findByRole('heading', { name: 'Route NX1' })).toBeInTheDocument();
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/routes/NX1-901');
  });

  it('shows the 404 for a route with nothing running as a plain message', async () => {
    const fetch = vi.fn<Fetch>(() =>
      Promise.resolve(
        Response.json({ error: 'no running services on this route' }, { status: 404 }),
      ),
    );

    renderPage('/routes/WEST-201', fetch);

    expect(
      await screen.findByText('No services are running on this route right now.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Route WEST-201' })).toBeInTheDocument();
  });
});
