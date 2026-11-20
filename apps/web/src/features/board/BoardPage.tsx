import type { ReactElement } from 'react';
import { SummarySection, useSummary } from '../summary/index.ts';
import { BoardSection } from './BoardSection.tsx';
import { useDelays } from './useDelays.ts';
import { useFilters } from './useFilters.ts';

export function BoardPage(): ReactElement {
  const summary = useSummary();
  const [filters, setFilter] = useFilters();
  const delays = useDelays(filters);
  return (
    <>
      <SummarySection summary={summary} />
      <BoardSection delays={delays} filters={filters} onFilterChange={setFilter} />
    </>
  );
}
