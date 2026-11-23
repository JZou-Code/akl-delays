import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterForm } from './FilterForm.tsx';
import type { SetFilter } from './useFilters.ts';

function optionTexts(select: HTMLElement): string[] {
  return within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);
}

describe('FilterForm', () => {
  it('has a labelled control for mode and for status', () => {
    render(<FilterForm filters={{}} onChange={vi.fn<SetFilter>()} />);

    expect(screen.getByRole('form', { name: 'Filter the services' })).toBeInTheDocument();
    expect(optionTexts(screen.getByRole('combobox', { name: 'Mode' }))).toEqual([
      'All modes',
      'Bus',
      'Train',
      'Ferry',
    ]);
    expect(optionTexts(screen.getByRole('combobox', { name: 'Status' }))).toEqual([
      'All statuses',
      'Early',
      'On time',
      'Late',
      'Very late',
      'Cancelled',
      'No data',
    ]);
  });

  it('shows the filters it is given', () => {
    render(
      <FilterForm filters={{ mode: 'train', status: 'late' }} onChange={vi.fn<SetFilter>()} />,
    );

    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('train');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('late');
  });

  it('has a search box that shows the search text', () => {
    render(<FilterForm filters={{ q: 'newmarket' }} onChange={vi.fn<SetFilter>()} />);

    expect(screen.getByRole('searchbox', { name: 'Route or stop' })).toHaveValue('newmarket');
  });

  it('shows all when no filter is set', () => {
    render(<FilterForm filters={{}} onChange={vi.fn<SetFilter>()} />);

    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('');
  });

  it('reports a change with the filter name and value', () => {
    const onChange = vi.fn<SetFilter>();
    render(<FilterForm filters={{ mode: 'bus' }} onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'cancelled' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Mode' }), { target: { value: '' } });

    expect(onChange.mock.calls).toEqual([
      ['status', 'cancelled'],
      ['mode', ''],
    ]);
  });
});
