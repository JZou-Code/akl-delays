import type { ReactElement } from 'react';
import { failureReason, isNoDataYet } from '../api/index.ts';

export interface LoadNoticeProps {
  loading: boolean;
  error: Error | undefined;
}

function noticeText({ loading, error }: LoadNoticeProps): string | null {
  if (isNoDataYet(error)) return 'Waiting for the first data from the feed.';
  if (error !== undefined) return `Could not load the data (${failureReason(error)}).`;
  if (loading) return 'Loading.';
  return null;
}

export function LoadNotice(props: LoadNoticeProps): ReactElement | null {
  const text = noticeText(props);
  if (text === null) return null;
  return (
    <p className="notice" role="status">
      {text}
    </p>
  );
}
