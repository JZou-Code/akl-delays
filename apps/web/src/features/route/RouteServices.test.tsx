import type { ServiceDelay } from '@akl-delays/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteServices } from './RouteServices.tsx';

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

describe('RouteServices', () => {
  it('shows status, delay, stop and vehicle for each service', () => {
    render(
      <RouteServices
        services={[
          service({}),
          service({
            tripId: 'nx1-0730-1',
            delaySeconds: -120,
            status: 'early',
            stopId: '4003-901',
            stopName: null,
            vehicleId: null,
          }),
        ]}
      />,
    );

    const table = screen.getByRole('table', { name: 'Services on this route, worst delay first' });
    const [header, ...rows] = within(table).getAllByRole('row');
    const texts = (row: HTMLElement | undefined) =>
      Array.from(row?.children ?? [], (cell) => cell.textContent);
    expect(texts(header)).toEqual(['Status', 'Delay', 'Stop', 'Vehicle']);
    expect(rows.map(texts)).toEqual([
      ['Late', '8 min late', 'Constellation Station', '51101'],
      ['Early', '2 min early', '4003-901', 'Unknown'],
    ]);
  });
});
