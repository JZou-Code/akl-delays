import type { Summary } from '@akl-delays/shared';
import { isNotFound } from '../api/index.ts';
import type { Polling } from '../hooks/index.ts';

export interface BannerState {
  stale: boolean;
  failure: Error | undefined;
  fetchedAt: string | undefined;
}

function failedAfterData({ data, error }: Polling<unknown>): boolean {
  return data !== undefined && error !== undefined && !isNotFound(error);
}

export function bannerState(summary: Polling<Summary>, ...others: Polling<unknown>[]): BannerState {
  return {
    stale: summary.data?.stale ?? false,
    failure: [summary, ...others].find(failedAfterData)?.error,
    fetchedAt: summary.data?.fetchedAt,
  };
}
