import type { ReactElement } from 'react';
import { failureReason, isNoDataYet } from '../api/index.ts';
import type { BannerState } from './banner-state.ts';
import { formatClock } from './format.ts';

function failureText(failure: Error, fetchedAt: string | undefined): string {
  const what = isNoDataYet(failure)
    ? 'The API is waiting for the first data from the feed.'
    : `The last update failed (${failureReason(failure)}).`;
  const shown =
    fetchedAt === undefined
      ? 'This is the last data the page got.'
      : `This is the data from ${formatClock(fetchedAt)}.`;
  return `${what} ${shown} The page keeps trying.`;
}

export function StatusBanner({ stale, failure, fetchedAt }: BannerState): ReactElement | null {
  if (!stale && failure === undefined) return null;
  return (
    <div className="banner" role="status">
      {failure !== undefined && <p>{failureText(failure, fetchedAt)}</p>}
      {stale && (
        <p>
          The data is out of date.
          {fetchedAt !== undefined && ` The API last got the feed at ${formatClock(fetchedAt)}.`}
        </p>
      )}
    </div>
  );
}
