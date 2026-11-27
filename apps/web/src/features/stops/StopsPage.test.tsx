import type { StopsPage as StopsBody } from '@akl-delays/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { FetchProvider, type Fetch } from '../../api/index.ts';
import { StopsPage } from './StopsPage.tsx';

const found: StopsBody = {
  stops: [
    { stopId: '4227-x', code: '4227', name: 'Stop C Albany Bus Station' },
    { stopId: '9999-y', code: null, name: null },
  ],
};

function renderPage(url: string, fetch: Fetch) {
  render(
    <FetchProvider fetch={fetch}>
      <MemoryRouter initialEntries={[url]}>
        <StopsPage />
      </MemoryRouter>
    </FetchProvider>,
  );
}

describe('StopsPage', () => {
  it('says what to type and asks nothing until there is text', () => {
    const fetch = vi.fn<Fetch>();

    renderPage('/stops', fetch);

    expect(screen.getByText(/Type part of a stop's name/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('searches for the text in the URL and links each stop to its page', async () => {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(Response.json(found)));

    renderPage('/stops?q=albany', fetch);

    expect(screen.getByRole('searchbox', { name: 'Stop name or number' })).toHaveValue('albany');
    const link = await screen.findByRole('link', { name: 'Stop C Albany Bus Station' });
    expect(link).toHaveAttribute('href', '/stops/4227-x');
    expect(screen.getByText('Stop 4227')).toBeInTheDocument();
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/stops?q=albany');
  });

  it('shows the id of a stop with no name', async () => {
    renderPage(
      '/stops?q=9999',
      vi.fn<Fetch>(() => Promise.resolve(Response.json(found))),
    );

    expect(await screen.findByRole('link', { name: '9999-y' })).toBeInTheDocument();
  });

  it('searches again once typing stops', async () => {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(Response.json(found)));
    renderPage('/stops', fetch);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Stop name or number' }), {
      target: { value: 'alb' },
    });

    expect(await screen.findByRole('link', { name: 'Stop C Albany Bus Station' })).toBeVisible();
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/stops?q=alb');
  });

  it('says so when no stop matches', async () => {
    renderPage(
      '/stops?q=zzz',
      vi.fn<Fetch>(() => Promise.resolve(Response.json({ stops: [] }))),
    );

    expect(await screen.findByText('No stops match.')).toBeInTheDocument();
  });

  it('says why when the search fails', async () => {
    const fetch = vi.fn<Fetch>(() =>
      Promise.resolve(Response.json({ error: 'the timetable is not loaded' }, { status: 503 })),
    );

    renderPage('/stops?q=albany', fetch);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not search the stops (the timetable is not loaded).',
    );
  });
});
