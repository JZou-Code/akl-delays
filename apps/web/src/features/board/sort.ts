import { SORT_KEYS, SORT_ORDERS, type SortKey, type SortOrder } from '@akl-delays/shared';

export interface Sort {
  key: SortKey;
  order: SortOrder;
}

export const DEFAULT_SORT: Sort = { key: 'delay', order: 'desc' };

function isKey(value: string | null): value is SortKey {
  return SORT_KEYS.some((key) => key === value);
}

function isOrder(value: string | null): value is SortOrder {
  return SORT_ORDERS.some((order) => order === value);
}

function firstOrder(key: SortKey): SortOrder {
  return key === 'delay' ? 'desc' : 'asc';
}

export function isDefaultSort(sort: Sort): boolean {
  return sort.key === DEFAULT_SORT.key && sort.order === DEFAULT_SORT.order;
}

export function sortFromSearch(search: URLSearchParams): Sort {
  const key = search.get('sort');
  const order = search.get('order');
  if (!isKey(key)) return DEFAULT_SORT;
  return { key, order: isOrder(order) ? order : firstOrder(key) };
}

// A second click on the same column turns it around. A new column starts at its first order.
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key !== key) return { key, order: firstOrder(key) };
  return { key, order: current.order === 'asc' ? 'desc' : 'asc' };
}

export function searchWithSort(search: URLSearchParams, sort: Sort): URLSearchParams {
  const next = new URLSearchParams(search);
  next.delete('sort');
  next.delete('order');
  if (!isDefaultSort(sort)) {
    next.set('sort', sort.key);
    next.set('order', sort.order);
  }
  return next;
}

export function sortQuery(sort: Sort): { sort?: SortKey; order?: SortOrder } {
  return isDefaultSort(sort) ? {} : { sort: sort.key, order: sort.order };
}
