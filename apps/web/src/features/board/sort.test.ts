import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SORT,
  isDefaultSort,
  nextSort,
  searchWithSort,
  sortFromSearch,
  sortQuery,
} from './sort.ts';

describe('sortFromSearch', () => {
  it('is worst delay first when the query has no sort', () => {
    expect(sortFromSearch(new URLSearchParams('mode=bus'))).toEqual({
      key: 'delay',
      order: 'desc',
    });
  });

  it('reads the column and the order', () => {
    expect(sortFromSearch(new URLSearchParams('sort=route&order=desc'))).toEqual({
      key: 'route',
      order: 'desc',
    });
  });

  it('uses the first order of the column when the order is missing or not known', () => {
    expect(sortFromSearch(new URLSearchParams('sort=stop'))).toEqual({ key: 'stop', order: 'asc' });
    expect(sortFromSearch(new URLSearchParams('sort=delay&order=up'))).toEqual(DEFAULT_SORT);
  });

  it('ignores a column it does not know', () => {
    expect(sortFromSearch(new URLSearchParams('sort=colour&order=asc'))).toEqual(DEFAULT_SORT);
  });
});

describe('nextSort', () => {
  it('starts a name column in ascending order', () => {
    expect(nextSort(DEFAULT_SORT, 'route')).toEqual({ key: 'route', order: 'asc' });
  });

  it('starts the delay column with the worst delay first', () => {
    expect(nextSort({ key: 'route', order: 'asc' }, 'delay')).toEqual(DEFAULT_SORT);
  });

  it('turns the order around for the column already sorted', () => {
    expect(nextSort({ key: 'route', order: 'asc' }, 'route')).toEqual({
      key: 'route',
      order: 'desc',
    });
    expect(nextSort(DEFAULT_SORT, 'delay')).toEqual({ key: 'delay', order: 'asc' });
  });
});

describe('searchWithSort', () => {
  it('sets the sort and keeps the filters', () => {
    const next = searchWithSort(new URLSearchParams('mode=bus'), { key: 'stop', order: 'asc' });

    expect(next.toString()).toBe('mode=bus&sort=stop&order=asc');
  });

  it('takes the default sort out of the query', () => {
    const next = searchWithSort(new URLSearchParams('mode=bus&sort=stop&order=asc'), DEFAULT_SORT);

    expect(next.toString()).toBe('mode=bus');
  });

  it('leaves the query it is given alone', () => {
    const search = new URLSearchParams('sort=stop&order=asc');

    searchWithSort(search, DEFAULT_SORT);

    expect(search.toString()).toBe('sort=stop&order=asc');
  });
});

describe('sortQuery', () => {
  it('is empty for the default sort, which the API applies by itself', () => {
    expect(sortQuery(DEFAULT_SORT)).toEqual({});
    expect(isDefaultSort(DEFAULT_SORT)).toBe(true);
  });

  it('names the column and the order for any other sort', () => {
    expect(sortQuery({ key: 'delay', order: 'asc' })).toEqual({ sort: 'delay', order: 'asc' });
  });
});
