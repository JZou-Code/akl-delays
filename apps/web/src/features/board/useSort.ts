import type { SortKey } from '@akl-delays/shared';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { nextSort, searchWithSort, sortFromSearch, type Sort } from './sort.ts';

export type SortBy = (key: SortKey) => void;

export function useSort(): [Sort, SortBy] {
  const [search, setSearch] = useSearchParams();
  const sortBy = useCallback<SortBy>(
    (key) => {
      setSearch((previous) => searchWithSort(previous, nextSort(sortFromSearch(previous), key)), {
        replace: true,
      });
    },
    [setSearch],
  );
  return [sortFromSearch(search), sortBy];
}
