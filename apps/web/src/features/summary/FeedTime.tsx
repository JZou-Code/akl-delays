import type { ReactElement } from 'react';
import { formatAge, formatClock } from '../../components/index.ts';
import { useNow } from '../../hooks/index.ts';

export interface FeedTimeProps {
  feedTimestamp: string;
  fetchedAt: string;
}

export function FeedTime({ feedTimestamp, fetchedAt }: FeedTimeProps): ReactElement {
  const now = useNow();
  return (
    <p className="feed-time">
      Feed time <time dateTime={feedTimestamp}>{formatClock(feedTimestamp)}</time>, updated{' '}
      <time dateTime={fetchedAt}>{formatAge(fetchedAt, now)}</time>.
    </p>
  );
}
