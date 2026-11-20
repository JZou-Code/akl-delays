import type { ReactElement } from 'react';
import { BoardPage } from './features/board/index.ts';

export function App(): ReactElement {
  return (
    <>
      <header className="page-header">
        <h1>Auckland delays</h1>
        <p>How late Auckland's buses, trains and ferries are running now.</p>
      </header>
      <main className="page">
        <BoardPage />
      </main>
    </>
  );
}
