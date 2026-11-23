import type { RouteDetail, ServiceDelay, Summary } from '@akl-delays/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import { FetchProvider, type Fetch } from './api/index.ts';

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

const summary: Summary = {
  feedTimestamp: '2026-11-19T19:00:00.000Z',
  fetchedAt: '2026-11-19T19:00:05.000Z',
  stale: false,
  modes: { bus: { ...zero, late: 1, total: 1 }, train: zero, ferry: zero },
};

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
  services: [service],
};

function answer(input: Parameters<Fetch>[0]): unknown {
  if (input === '/api/summary') return summary;
  if (input === '/api/routes/NX1-901') return detail;
  return { total: 1, services: [service] };
}

const fetch = vi.fn<Fetch>((input) => Promise.resolve(Response.json(answer(input))));

function renderApp(url = '/') {
  render(
    <FetchProvider fetch={fetch}>
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>
    </FetchProvider>,
  );
}

describe('App', () => {
  it('shows the page heading and a link to the board', () => {
    renderApp();

    expect(screen.getByRole('heading', { level: 1, name: 'Auckland delays' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toContainElement(screen.getByRole('link', { name: 'Board' }));
  });

  it('shows the board at the root', async () => {
    renderApp();

    expect(await screen.findByRole('link', { name: 'NX1' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Services by status and mode' })).toBeInTheDocument();
  });

  it('shows one route at its own path', async () => {
    renderApp('/routes/NX1-901');

    expect(await screen.findByRole('heading', { name: 'Route NX1' })).toBeInTheDocument();
  });

  it('opens the route view from a route name on the board', async () => {
    renderApp();

    fireEvent.click(await screen.findByRole('link', { name: 'NX1' }));

    expect(await screen.findByRole('heading', { name: 'Route NX1' })).toBeInTheDocument();
  });

  it('says so for a path it does not know', () => {
    renderApp('/nothing-here');

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the board' })).toHaveAttribute('href', '/');
  });
});
