import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { filtersFromSearch, searchWithFilter, type FilterName, type Filters } from './filters.ts';

export type SetFilter = (name: FilterName, value: string) => void;

export function useFilters(): [Filters, SetFilter] {
  const [search, setSearch] = useSearchParams();
  const setFilter = useCallback<SetFilter>(
    (name, value) => {
      setSearch((previous) => searchWithFilter(previous, name, value), { replace: true });
    },
    [setSearch],
  );
  return [filtersFromSearch(search), setFilter];
}
