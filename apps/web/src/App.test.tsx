import type { ServiceDelay, Summary } from '@akl-delays/shared';
import { render, screen } from '@testing-library/react';
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

const services: ServiceDelay[] = [
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
];

const fetch = vi.fn<Fetch>((input) =>
  Promise.resolve(Response.json(input === '/api/summary' ? summary : services)),
);

function renderApp() {
  render(
    <FetchProvider fetch={fetch}>
      <App />
    </FetchProvider>,
  );
}

describe('App', () => {
  it('shows the page heading', () => {
    renderApp();

    expect(screen.getByRole('heading', { level: 1, name: 'Auckland delays' })).toBeInTheDocument();
  });

  it('shows the summary from the API', async () => {
    renderApp();

    expect(
      await screen.findByRole('table', { name: 'Services by status and mode' }),
    ).toBeInTheDocument();
  });

  it('shows the services from the API', async () => {
    renderApp();

    expect(await screen.findByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
  });
});
