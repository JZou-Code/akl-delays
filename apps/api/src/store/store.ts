import type { ServiceDelay } from '@akl-delays/shared';

export interface Snapshot {
  feedTimestamp: string;
  fetchedAt: string;
  services: ServiceDelay[];
}

export interface Store {
  set: (snapshot: Snapshot) => void;
  get: () => Snapshot | null;
  isStale: () => boolean;
}

export const STALE_AFTER_POLLS = 3;

export interface MemoryStoreOptions {
  pollIntervalSeconds: number;
  now: () => Date;
}

export function createMemoryStore({ pollIntervalSeconds, now }: MemoryStoreOptions): Store {
  const staleAfterMs = STALE_AFTER_POLLS * pollIntervalSeconds * 1000;
  let latest: Snapshot | null = null;
  return {
    set: (snapshot) => {
      latest = snapshot;
    },
    get: () => latest,
    isStale: () => latest === null || now().getTime() - Date.parse(latest.fetchedAt) > staleAfterMs,
  };
}
