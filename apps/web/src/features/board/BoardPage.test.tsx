import type { ServiceDelay, Summary } from '@akl-delays/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

function answering(summaryBody: Summary = summary, total = 1) {
  return vi.fn<Fetch>((input) =>
    Promise.resolve(
      Response.json(input === '/api/summary' ? summaryBody : { total, services: [service] }),
    ),
  );
}

function renderPage(url: string, fetch = answering()) {
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

afterEach(() => {
  vi.useRealTimers();
});

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
    expect(delaysPaths()).toEqual(['/api/delays?mode=bus&status=late&limit=50']);
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
        '/api/delays?mode=bus&limit=50',
        '/api/delays?mode=bus&status=very_late&limit=50',
      ]);
    });
    expect(screen.getByRole('status', { name: 'search' })).toHaveTextContent(
      '?mode=bus&status=very_late',
    );
  });

  it('puts the search text in the URL and asks again once typing stops', async () => {
    const { delaysPaths } = renderPage('/?mode=bus');
    await screen.findByRole('rowheader', { name: 'NX1' });

    fireEvent.change(screen.getByRole('searchbox', { name: 'Route or stop' }), {
      target: { value: 'nx' },
    });

    await waitFor(() => {
      expect(delaysPaths()).toEqual([
        '/api/delays?mode=bus&limit=50',
        '/api/delays?mode=bus&q=nx&limit=50',
      ]);
    });
    expect(screen.getByRole('status', { name: 'search' })).toHaveTextContent('?mode=bus&q=nx');
    expect(screen.getByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
  });

  it('puts the pressed column in the URL and asks for that sort', async () => {
    const { delaysPaths } = renderPage('/?mode=bus');
    await screen.findByRole('rowheader', { name: 'NX1' });

    fireEvent.click(screen.getByRole('button', { name: 'Route' }));

    await waitFor(() => {
      expect(delaysPaths()).toEqual([
        '/api/delays?mode=bus&limit=50',
        '/api/delays?mode=bus&sort=route&order=asc&limit=50',
      ]);
    });
    expect(screen.getByRole('status', { name: 'search' })).toHaveTextContent(
      '?mode=bus&sort=route&order=asc',
    );
    expect(screen.getByRole('columnheader', { name: 'Route' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('asks for one more page of rows when more is pressed, and for one page after a new filter', async () => {
    const { delaysPaths } = renderPage('/', answering(summary, 120));
    await screen.findByRole('rowheader', { name: 'NX1' });

    fireEvent.click(screen.getByRole('button', { name: 'Show 50 more' }));
    await waitFor(() => {
      expect(delaysPaths()).toEqual(['/api/delays?limit=50', '/api/delays?limit=100']);
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'Mode' }), { target: { value: 'bus' } });
    await waitFor(() => {
      expect(delaysPaths().at(-1)).toBe('/api/delays?mode=bus&limit=50');
    });
  });

  it('says when the data is out of date and still shows it', async () => {
    renderPage('/', answering({ ...summary, stale: true }));

    expect(await screen.findByText(/^The data is out of date/)).toBeInTheDocument();
    expect(await screen.findByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
  });

  it('says when a later request fails and keeps the last good data', async () => {
    vi.useFakeTimers();
    const fetch = answering();
    renderPage('/', fetch);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.queryByText(/^The last update failed/)).not.toBeInTheDocument();

    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(screen.getByText(/^The last update failed/)).toHaveTextContent(
      'The last update failed (could not reach the API).',
    );
    expect(screen.getByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Services by status and mode' })).toBeInTheDocument();
  });

  it('says nothing went wrong again once a request works', async () => {
    vi.useFakeTimers();
    const fetch = answering();
    renderPage('/', fetch);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(screen.queryByText(/^The last update failed/)).not.toBeInTheDocument();
  });
});
