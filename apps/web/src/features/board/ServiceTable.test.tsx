import type { ServiceDelay } from '@akl-delays/shared';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ServiceTable } from './ServiceTable.tsx';

function service(overrides: Partial<ServiceDelay>): ServiceDelay {
  return {
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
    ...overrides,
  };
}

function renderTable(services: ServiceDelay[]) {
  render(
    <MemoryRouter>
      <ServiceTable services={services} />
    </MemoryRouter>,
  );
}

function rowTexts(): string[][] {
  const table = screen.getByRole('table', { name: 'Services, worst delay first' });
  const [, ...rows] = within(table).getAllByRole('row');
  return rows.map((row) => Array.from(row.children, (cell) => cell.textContent));
}

describe('ServiceTable', () => {
  it('has a column for route, mode, status, delay and stop', () => {
    renderTable([]);

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Route',
      'Mode',
      'Status',
      'Delay',
      'Stop',
    ]);
  });

  it('shows one row per service in the order it is given', () => {
    renderTable([
      service({
        tripId: 'west-1',
        routeId: 'WEST-201',
        routeName: 'WEST',
        mode: 'train',
        delaySeconds: 1080,
        status: 'very_late',
        stopName: 'Henderson Train Station',
      }),
      service({}),
      service({
        tripId: 'dev-1',
        routeId: 'DEV-209',
        routeName: 'DEV',
        mode: 'ferry',
        delaySeconds: null,
        status: 'cancelled',
        stopName: 'Devonport Wharf',
      }),
    ]);

    expect(rowTexts()).toEqual([
      ['WEST', 'Train', 'Very late', '18 min late', 'Henderson Train Station'],
      ['NX1', 'Bus', 'Late', '8 min late', 'Constellation Station'],
      ['DEV', 'Ferry', 'Cancelled', 'cancelled', 'Devonport Wharf'],
    ]);
  });

  it('links each route name to the route view', () => {
    renderTable([service({})]);

    expect(screen.getByRole('link', { name: 'NX1' })).toHaveAttribute('href', '/routes/NX1-901');
  });

  it('falls back to the ids when the names are not known', () => {
    renderTable([
      service({ routeId: 'X9-901', routeName: null, mode: null, stopId: '9999-1', stopName: null }),
      service({ tripId: 'no-stop', stopId: null, stopName: null }),
    ]);

    expect(rowTexts()).toEqual([
      ['X9-901', 'Unknown', 'Late', '8 min late', '9999-1'],
      ['NX1', 'Bus', 'Late', '8 min late', 'Unknown'],
    ]);
    expect(screen.getByRole('link', { name: 'X9-901' })).toHaveAttribute('href', '/routes/X9-901');
  });
});
