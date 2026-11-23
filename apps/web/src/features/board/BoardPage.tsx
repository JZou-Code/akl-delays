import type { ReactElement } from 'react';
import { bannerState, StatusBanner } from '../../components/index.ts';
import { SummarySection, useSummary } from '../summary/index.ts';
import { BoardSection } from './BoardSection.tsx';
import { useDelays } from './useDelays.ts';
import { sortQuery } from './sort.ts';
import { useFilters } from './useFilters.ts';
import { useRows } from './useRows.ts';
import { useSort } from './useSort.ts';

export function BoardPage(): ReactElement {
  const summary = useSummary();
  const [filters, setFilter] = useFilters();
  const [sort, sortBy] = useSort();
  const [rows, showMore] = useRows(JSON.stringify([filters, sort]));
  const delays = useDelays({ ...filters, ...sortQuery(sort), limit: rows });
  return (
    <>
      <StatusBanner {...bannerState(summary, delays)} />
      <SummarySection summary={summary} />
      <BoardSection
        delays={delays}
        filters={filters}
        onFilterChange={setFilter}
        sort={sort}
        onSort={sortBy}
        onShowMore={showMore}
      />
    </>
  );
}
