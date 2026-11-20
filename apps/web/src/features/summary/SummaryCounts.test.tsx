import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SummaryCounts } from './SummaryCounts.tsx';

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

const modes = {
  bus: { ...zero, on_time: 3, late: 2, very_late: 1, total: 6 },
  train: { ...zero, on_time: 1, cancelled: 1, total: 2 },
  ferry: { ...zero, early: 1, unknown: 1, total: 2 },
};

function cellsOf(rowName: string): string[] {
  const header = screen.getByRole('rowheader', { name: rowName });
  const row = header.closest('tr');
  if (row === null) throw new Error(`no row for ${rowName}`);
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);
}

describe('SummaryCounts', () => {
  it('has a column per mode', () => {
    render(<SummaryCounts modes={modes} />);

    const table = screen.getByRole('table', { name: 'Services by status and mode' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual([
      'Status',
      'Bus',
      'Train',
      'Ferry',
    ]);
  });

  it('gives the count for each status and mode', () => {
    render(<SummaryCounts modes={modes} />);

    expect(cellsOf('Early')).toEqual(['0', '0', '1']);
    expect(cellsOf('On time')).toEqual(['3', '1', '0']);
    expect(cellsOf('Late')).toEqual(['2', '0', '0']);
    expect(cellsOf('Very late')).toEqual(['1', '0', '0']);
    expect(cellsOf('Cancelled')).toEqual(['0', '1', '0']);
    expect(cellsOf('No data')).toEqual(['0', '0', '1']);
  });

  it('gives the total for each mode', () => {
    render(<SummaryCounts modes={modes} />);

    expect(cellsOf('All')).toEqual(['6', '2', '2']);
  });
});
