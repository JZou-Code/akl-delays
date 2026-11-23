import { useState } from 'react';

export const PAGE_ROWS = 50;

// The number of rows to ask for. It goes back to PAGE_ROWS when the key changes, such as a new filter or sort.
export function useRows(key: string): [number, () => void] {
  const [held, setHeld] = useState({ key, rows: PAGE_ROWS });
  const rows = held.key === key ? held.rows : PAGE_ROWS;
  const showMore = () => {
    setHeld({ key, rows: rows + PAGE_ROWS });
  };
  return [rows, showMore];
}
