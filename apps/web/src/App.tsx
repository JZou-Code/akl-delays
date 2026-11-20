import type { ReactElement } from 'react';
import { BoardSection, useDelays } from './features/board/index.ts';
import { SummarySection, useSummary } from './features/summary/index.ts';

export function App(): ReactElement {
  const summary = useSummary();
  const delays = useDelays({});
  return (
    <>
      <header className="page-header">
        <h1>Auckland delays</h1>
        <p>How late Auckland's buses, trains and ferries are running now.</p>
      </header>
      <main className="page">
        <SummarySection summary={summary} />
        <BoardSection delays={delays} />
      </main>
    </>
  );
}
