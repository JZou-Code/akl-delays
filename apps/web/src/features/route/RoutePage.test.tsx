import type { RouteDetail, Summary } from '@akl-delays/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { FetchProvider, type Fetch } from '../../api/index.ts';
import { ROUTE_PATH } from './paths.ts';
import { RoutePage } from './RoutePage.tsx';

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

const summary: Summary = {
  feedTimestamp: '2026-11-19T19:00:00.000Z',
  fetchedAt: '2026-11-19T19:00:05.000Z',
  stale: false,
  modes: { bus: { ...zero, late: 1, total: 1 }, train: zero, ferry: zero },
};

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

function fetchAnswering(route: Response, summaryBody: Summary = summary) {
  return vi.fn<Fetch>((input) =>
    Promise.resolve(input === '/api/summary' ? Response.json(summaryBody) : route.clone()),
  );
}

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
    const fetch = fetchAnswering(Response.json(detail));

    renderPage('/routes/NX1-901', fetch);

    expect(await screen.findByRole('heading', { name: 'Route NX1' })).toBeInTheDocument();
    expect(fetch.mock.calls.map(([input]) => input)).toContain('/api/routes/NX1-901');
  });

  it('shows the feed time', async () => {
    renderPage('/routes/NX1-901', fetchAnswering(Response.json(detail)));

    expect(await screen.findByText(/^Feed time/)).toBeInTheDocument();
  });

  it('says when the data is out of date', async () => {
    renderPage(
      '/routes/NX1-901',
      fetchAnswering(Response.json(detail), { ...summary, stale: true }),
    );

    expect(await screen.findByText(/^The data is out of date/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Route NX1' })).toBeInTheDocument();
  });

  it('shows the 404 for a route with nothing running as a plain message', async () => {
    const fetch = fetchAnswering(
      Response.json({ error: 'no running services on this route' }, { status: 404 }),
    );

    renderPage('/routes/WEST-201', fetch);

    expect(
      await screen.findByText('No services are running on this route right now.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Route WEST-201' })).toBeInTheDocument();
    expect(screen.queryByText(/^The last update failed/)).not.toBeInTheDocument();
  });
});
