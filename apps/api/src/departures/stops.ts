import type { StopSummary } from '@akl-delays/shared';

export const DEFAULT_STOPS = 20;

export interface StopSearch {
  stops: readonly StopSummary[];
  // True for a stop that some trip calls at. A station that only groups platforms has none.
  hasTrips: (stopId: string) => boolean;
  text: string;
  limit?: number;
}

function rank(stop: StopSummary, text: string): number {
  if (stop.code?.toLowerCase() === text) return 0;
  if (stop.name?.toLowerCase().startsWith(text) === true) return 1;
  return 2;
}

const names = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

// Every word of the text has to be in the stop's name or start its code.
export function searchStops({ stops, hasTrips, text, limit }: StopSearch): StopSummary[] {
  const wanted = text.trim().toLowerCase();
  const words = wanted.split(/\s+/).filter((word) => word !== '');
  if (words.length === 0) return [];
  return stops
    .filter((stop) => {
      const name = stop.name?.toLowerCase() ?? '';
      const code = stop.code?.toLowerCase() ?? '';
      return words.every((word) => name.includes(word) || code.startsWith(word));
    })
    .filter((stop) => hasTrips(stop.stopId))
    .sort(
      (a, b) =>
        rank(a, wanted) - rank(b, wanted) ||
        names.compare(a.name ?? '', b.name ?? '') ||
        names.compare(a.code ?? '', b.code ?? ''),
    )
    .slice(0, limit ?? DEFAULT_STOPS);
}
