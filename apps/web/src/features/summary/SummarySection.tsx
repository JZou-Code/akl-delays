import type { Summary } from '@akl-delays/shared';
import type { ReactElement } from 'react';
import { LoadNotice } from '../../components/index.ts';
import type { Polling } from '../../hooks/index.ts';
import { FeedTime } from './FeedTime.tsx';
import { SummaryCounts } from './SummaryCounts.tsx';

export function SummarySection({ summary }: { summary: Polling<Summary> }): ReactElement {
  const { data } = summary;
  return (
    <section className="summary">
      <h2>Summary</h2>
      {data === undefined ? (
        <LoadNotice loading={summary.loading} error={summary.error} />
      ) : (
        <>
          <FeedTime feedTimestamp={data.feedTimestamp} fetchedAt={data.fetchedAt} />
          <SummaryCounts modes={data.modes} />
        </>
      )}
    </section>
  );
}
