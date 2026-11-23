import type { DelaysPage, ServiceDelay } from '@akl-delays/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../api/index.ts';
import type { Polling } from '../../hooks/index.ts';
import { BoardSection } from './BoardSection.tsx';
import type { Filters } from './filters.ts';
import { DEFAULT_SORT } from './sort.ts';
import type { SetFilter } from './useFilters.ts';
import type { SortBy } from './useSort.ts';

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

function polling(state: Partial<Polling<DelaysPage>>): Polling<DelaysPage> {
  return { data: undefined, error: undefined, loading: false, ...state };
}

function renderSection(state: Partial<Polling<DelaysPage>>, filters: Filters = {}) {
  const onShowMore = vi.fn<() => void>();
  render(
    <MemoryRouter>
      <BoardSection
        delays={polling(state)}
        filters={filters}
        onFilterChange={vi.fn<SetFilter>()}
        sort={DEFAULT_SORT}
        onSort={vi.fn<SortBy>()}
        onShowMore={onShowMore}
      />
    </MemoryRouter>,
  );
  return { onShowMore };
}

describe('BoardSection', () => {
  it('says it is loading before the first answer', () => {
    renderSection({ loading: true });

    expect(screen.getByRole('status')).toHaveTextContent('Loading.');
  });

  it('says it is waiting when the API has no data yet', () => {
    renderSection({ error: new ApiRequestError(503, 'no feed data yet') });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Waiting for the first data from the feed.',
    );
  });

  it('says so when the feed has no services', () => {
    renderSection({ data: { total: 0, services: [] } });

    expect(screen.getByText('The feed has no services right now.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says so when no service matches the filters', () => {
    renderSection({ data: { total: 0, services: [] } }, { mode: 'ferry', status: 'cancelled' });

    expect(screen.getByText('No services match these filters.')).toBeInTheDocument();
  });

  it('shows the filters and the services', () => {
    renderSection({ data: { total: 1, services: [service] } }, { mode: 'bus' });

    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('bus');
    expect(screen.getByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
  });

  it('keeps showing the services when a later request fails', () => {
    renderSection({
      data: { total: 1, services: [service] },
      error: new ApiRequestError(502, 'the API answered HTTP 502'),
    });

    expect(screen.getByRole('rowheader', { name: 'NX1' })).toBeInTheDocument();
  });

  it('says how many services it shows and has no button when that is all of them', () => {
    renderSection({ data: { total: 1, services: [service] } });

    expect(screen.getByText('Showing 1 of 1 services.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Show \d+ more$/ })).not.toBeInTheDocument();
  });

  it('offers the next page when the limit left services out', () => {
    const { onShowMore } = renderSection({ data: { total: 887, services: [service] } });

    expect(screen.getByText('Showing 1 of 887 services.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show 50 more' }));

    expect(onShowMore).toHaveBeenCalledTimes(1);
  });

  it('offers only what is left when that is less than a page', () => {
    renderSection({ data: { total: 4, services: [service] } });

    expect(screen.getByRole('button', { name: 'Show 3 more' })).toBeInTheDocument();
  });
});
