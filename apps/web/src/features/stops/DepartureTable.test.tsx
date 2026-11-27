import type { Departure } from '@akl-delays/shared';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { formatTime } from '../../components/index.ts';
import { DepartureTable } from './DepartureTable.tsx';

const NOW = new Date('2026-11-19T19:00:00.000Z');

const live: Departure = {
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
};

const scheduled: Departure = {
  ...live,
  tripId: 't2',
  routeId: '917-203',
  routeName: '917',
  headsign: 'Albany Station To Birkenhead Wharf',
  scheduledAt: '2026-11-19T19:20:00.000Z',
  expectedAt: null,
  delaySeconds: null,
  status: 'unknown',
  live: false,
};

const cancelled: Departure = {
  ...scheduled,
  tripId: 't3',
  status: 'cancelled',
  live: true,
};

function rowOf(departure: Departure): HTMLElement {
  render(
    <MemoryRouter>
      <DepartureTable departures={[departure]} now={NOW} />
    </MemoryRouter>,
  );
  const row = screen.getAllByRole('row')[1];
  if (row === undefined) throw new Error('expected one row');
  return row;
}

describe('DepartureTable', () => {
  it('shows a live service with its expected time, the wait and how late it runs', () => {
    const row = rowOf(live);

    expect(within(row).getByRole('link', { name: 'NX1' })).toHaveAttribute(
      'href',
      '/routes/NX1-203',
    );
    expect(row).toHaveTextContent('Hibiscus Coast Station');
    expect(row).not.toHaveTextContent('Britomart');
    expect(row).toHaveTextContent(formatTime(live.expectedAt ?? ''));
    expect(row).toHaveTextContent('7 min');
    expect(row).toHaveTextContent('Late');
    expect(row).toHaveTextContent('5 min late');
  });

  it('shows a service with no live data at its timetable time', () => {
    const row = rowOf(scheduled);

    expect(row).toHaveTextContent(formatTime(scheduled.scheduledAt));
    expect(row).toHaveTextContent('20 min');
    expect(row).toHaveTextContent('Scheduled, no live data');
    expect(row).not.toHaveTextContent('No data');
  });

  it('shows a cancelled service with its timetable time and no wait', () => {
    const row = rowOf(cancelled);

    expect(row).toHaveTextContent(formatTime(cancelled.scheduledAt));
    expect(row).toHaveTextContent('Cancelled');
    expect(row).not.toHaveTextContent('20 min');
  });

  it('says due for a time that has come', () => {
    const row = rowOf({ ...live, expectedAt: '2026-11-19T18:58:00.000Z' });

    expect(row).toHaveTextContent('due');
  });
});
