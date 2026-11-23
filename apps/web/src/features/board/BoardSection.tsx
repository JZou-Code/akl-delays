import type { DelaysPage } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { LoadNotice } from '../../components/index.ts';
import type { Polling } from '../../hooks/index.ts';
import { FilterForm } from './FilterForm.tsx';
import { hasFilters, type Filters } from './filters.ts';
import { ServiceTable } from './ServiceTable.tsx';
import type { Sort } from './sort.ts';
import type { SetFilter } from './useFilters.ts';
import type { SortBy } from './useSort.ts';

export interface BoardSectionProps {
  delays: Polling<DelaysPage>;
  filters: Filters;
  onFilterChange: SetFilter;
  sort: Sort;
  onSort: SortBy;
}

function emptyText(filters: Filters): string {
  return hasFilters(filters)
    ? 'No services match these filters.'
    : 'The feed has no services right now.';
}

export function BoardSection(props: BoardSectionProps): ReactElement {
  const { delays, filters, onFilterChange, sort, onSort } = props;
  const services = delays.data?.services;
  return (
    <section className="board">
      <h2>Services</h2>
      <FilterForm filters={filters} onChange={onFilterChange} />
      {services === undefined && <LoadNotice loading={delays.loading} error={delays.error} />}
      {services?.length === 0 && <p className="notice">{emptyText(filters)}</p>}
      {services !== undefined && services.length > 0 && (
        <ServiceTable services={services} sort={sort} onSort={onSort} />
      )}
    </section>
  );
}
