import { describe, expect, it } from 'vitest';
import { filtersFromSearch, hasFilters, searchWithFilter } from './filters.ts';

describe('filtersFromSearch', () => {
  it('reads mode and status from the query', () => {
    expect(filtersFromSearch(new URLSearchParams('mode=ferry&status=very_late'))).toEqual({
      mode: 'ferry',
      status: 'very_late',
    });
  });

  it('reads the search text as it is written', () => {
    expect(filtersFromSearch(new URLSearchParams('q=Stop+A'))).toEqual({ q: 'Stop A' });
  });

  it('has no filters for an empty query', () => {
    expect(filtersFromSearch(new URLSearchParams(''))).toEqual({});
  });

  it('ignores values it does not know', () => {
    expect(filtersFromSearch(new URLSearchParams('mode=plane&status=lost'))).toEqual({});
  });

  it('ignores an empty value', () => {
    expect(filtersFromSearch(new URLSearchParams('mode=&status=late&q='))).toEqual({
      status: 'late',
    });
  });
});

describe('searchWithFilter', () => {
  it('sets a filter and keeps the others', () => {
    const next = searchWithFilter(new URLSearchParams('mode=bus'), 'status', 'late');

    expect(next.toString()).toBe('mode=bus&status=late');
  });

  it('replaces a filter', () => {
    const next = searchWithFilter(new URLSearchParams('mode=bus'), 'mode', 'train');

    expect(next.toString()).toBe('mode=train');
  });

  it('removes a filter set to the empty value', () => {
    const next = searchWithFilter(new URLSearchParams('mode=bus&status=late'), 'mode', '');

    expect(next.toString()).toBe('status=late');
  });

  it('leaves the query it is given alone', () => {
    const search = new URLSearchParams('mode=bus');

    searchWithFilter(search, 'mode', 'train');

    expect(search.toString()).toBe('mode=bus');
  });
});

describe('hasFilters', () => {
  it('is true when mode or status is set', () => {
    expect(hasFilters({ mode: 'bus' })).toBe(true);
    expect(hasFilters({ status: 'late' })).toBe(true);
    expect(hasFilters({ q: '70' })).toBe(true);
  });

  it('is false when neither is set', () => {
    expect(hasFilters({})).toBe(false);
  });
});
