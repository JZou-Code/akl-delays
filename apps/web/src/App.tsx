import type { ReactElement } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router';
import { BoardPage } from './features/board/index.ts';
import { ROUTE_PATH, RoutePage } from './features/route/index.ts';
import { ThemeSelect } from './theme/index.ts';

function NotFoundPage(): ReactElement {
  return (
    <section>
      <h2>Page not found</h2>
      <p>
        <Link to="/">Back to the board</Link>
      </p>
    </section>
  );
}

export function App(): ReactElement {
  return (
    <>
      <header className="page-header">
        <div className="page-header-inner">
          <div className="page-title">
            <h1>Auckland delays</h1>
            <p>How late Auckland's buses, trains and ferries are running now.</p>
          </div>
          <nav aria-label="Main">
            <NavLink to="/" end>
              Board
            </NavLink>
          </nav>
          <ThemeSelect />
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route index element={<BoardPage />} />
          <Route path={ROUTE_PATH} element={<RoutePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
