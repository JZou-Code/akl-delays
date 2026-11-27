export const STOPS_PATH = '/stops';
export const STOP_PATH = '/stops/:stopId';

export function stopPath(stopId: string): string {
  return `/stops/${encodeURIComponent(stopId)}`;
}
