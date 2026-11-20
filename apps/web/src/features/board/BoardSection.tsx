import type { ServiceDelay } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { LoadNotice } from '../../components/index.ts';
import type { Polling } from '../../hooks/index.ts';
import { FilterForm } from './FilterForm.tsx';
import { hasFilters, type Filters } from './filters.ts';
import { ServiceTable } from './ServiceTable.tsx';
import type { SetFilter } from './useFilters.ts';

export interface BoardSectionProps {
  delays: Polling<ServiceDelay[]>;
  filters: Filters;
  onFilterChange: SetFilter;
}

function emptyText(filters: Filters): string {
  return hasFilters(filters)
    ? 'No services match these filters.'
    : 'The feed has no services right now.';
}

export function BoardSection({ delays, filters, onFilterChange }: BoardSectionProps): ReactElement {
  const { data } = delays;
  return (
    <section className="board">
      <h2>Services</h2>
      <FilterForm filters={filters} onChange={onFilterChange} />
      {data === undefined && <LoadNotice loading={delays.loading} error={delays.error} />}
      {data?.length === 0 && <p className="notice">{emptyText(filters)}</p>}
      {data !== undefined && data.length > 0 && <ServiceTable services={data} />}
    </section>
  );
}
