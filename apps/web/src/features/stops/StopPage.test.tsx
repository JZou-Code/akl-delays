import type { StopDepartures } from '@akl-delays/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { FetchProvider, type Fetch } from '../../api/index.ts';
import { STOP_PATH } from './paths.ts';
import { StopPage } from './StopPage.tsx';

const body: StopDepartures = {
  stop: { stopId: '4227-x', code: '4227', name: 'Stop C Albany Bus Station' },
  feedTimestamp: '2026-11-19T19:00:00.000Z',
  departures: [
    {
      tripId: 't1',
      routeId: 'NX1-203',
      routeName: 'NX1',
      mode: 'bus',
      headsign: 'Britomart To Hibiscus Coast Station',
      scheduledAt: '2026-11-19T19:02:00.000Z',
      expectedAt: '2026-11-19T19:07:00.000Z',
      delaySeconds: 300,
      status: 'late',
      live: true,
    },
  ],
};

function renderPage(url: string, fetch: Fetch) {
  render(
    <FetchProvider fetch={fetch}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={STOP_PATH} element={<StopPage />} />
        </Routes>
      </MemoryRouter>
    </FetchProvider>,
  );
}

function answering(response: Response) {
  return vi.fn<Fetch>(() => Promise.resolve(response.clone()));
}

describe('StopPage', () => {
  it('shows the stop named in the URL with its number and its departures', async () => {
    const fetch = answering(Response.json(body));

    renderPage('/stops/4227-x', fetch);

    expect(
      await screen.findByRole('heading', { name: 'Stop C Albany Bus Station' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Stop 4227')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'NX1' })).toBeInTheDocument();
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/stops/4227-x/departures');
  });

  it('sends the route in the URL and shows it in the box', async () => {
    const fetch = answering(Response.json(body));

    renderPage('/stops/4227-x?route=NX', fetch);

    await screen.findByRole('link', { name: 'NX1' });
    expect(screen.getByRole('searchbox', { name: 'Route' })).toHaveValue('NX');
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/stops/4227-x/departures?route=NX');
  });

  it('asks again with the route once typing stops', async () => {
    const fetch = answering(Response.json(body));
    renderPage('/stops/4227-x', fetch);
    await screen.findByRole('link', { name: 'NX1' });

    fireEvent.change(screen.getByRole('searchbox', { name: 'Route' }), {
      target: { value: '83' },
    });

    await waitFor(() => {
      expect(fetch.mock.calls.map(([path]) => path)).toContain(
        '/api/stops/4227-x/departures?route=83',
      );
    });
  });

  it('says so when nothing is due', async () => {
    renderPage('/stops/4227-x', answering(Response.json({ ...body, departures: [] })));

    expect(
      await screen.findByText('No services are due at this stop in the next hour.'),
    ).toBeInTheDocument();
  });

  it('names the route when nothing on it is due', async () => {
    renderPage('/stops/4227-x?route=ZZ', answering(Response.json({ ...body, departures: [] })));

    expect(
      await screen.findByText(
        'No services on a route starting with ZZ are due at this stop in the next hour.',
      ),
    ).toBeInTheDocument();
  });

  it('says the stop was not found on a 404', async () => {
    const fetch = answering(Response.json({ error: 'no stop with this id' }, { status: 404 }));

    renderPage('/stops/nope', fetch);

    expect(await screen.findByRole('heading', { name: 'Stop not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find a stop' })).toHaveAttribute('href', '/stops');
  });

  it('says it is waiting when the API has no feed data yet', async () => {
    const fetch = answering(Response.json({ error: 'no feed data yet' }, { status: 503 }));

    renderPage('/stops/4227-x', fetch);

    expect(await screen.findByText('Waiting for the first data from the feed.')).toBeVisible();
  });
});
