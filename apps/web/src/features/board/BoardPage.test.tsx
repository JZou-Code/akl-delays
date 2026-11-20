import type { ServiceDelay, Summary } from '@akl-delays/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { FetchProvider, type Fetch } from '../../api/index.ts';
import { BoardPage } from './BoardPage.tsx';

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

function Search() {
  return <output aria-label="search">{useLocation().search}</output>;
}

function renderPage(url: string) {
  const fetch = vi.fn<Fetch>((input) =>
    Promise.resolve(Response.json(input === '/api/summary' ? summary : [service])),
  );
  render(
    <FetchProvider fetch={fetch}>
      <MemoryRouter initialEntries={[url]}>
        <BoardPage />
        <Search />
      </MemoryRouter>
    </FetchProvider>,
  );
  const delaysPaths = () =>
    fetch.mock.calls.map(([input]) => input).filter((input) => input !== '/api/summary');
  return { delaysPaths };
}

describe('BoardPage', () => {
  it('shows the summary and the services', async () => {
    renderPage('/');

    expect(
      await screen.findByRole('table', { name: 'Services by status and mode' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
  });

  it('asks for the services with the filters in the URL', async () => {
    const { delaysPaths } = renderPage('/?mode=bus&status=late');

    expect(await screen.findByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
    expect(delaysPaths()).toEqual(['/api/delays?mode=bus&status=late']);
    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('bus');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('late');
  });

  it('puts a changed filter in the URL and asks again', async () => {
    const { delaysPaths } = renderPage('/?mode=bus');
    await screen.findByRole('rowheader', { name: 'NX1' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'very_late' },
    });

    await waitFor(() => {
      expect(delaysPaths()).toEqual([
        '/api/delays?mode=bus',
        '/api/delays?mode=bus&status=very_late',
      ]);
    });
    expect(screen.getByRole('status', { name: 'search' })).toHaveTextContent(
      '?mode=bus&status=very_late',
    );
  });
});
