import type { StopSummary } from '@akl-delays/shared';
import { useCallback, type ReactElement } from 'react';
import { Link, useSearchParams } from 'react-router';
import { failureReason } from '../../api/index.ts';
import { SearchBox } from '../../components/index.ts';
import { stopPath } from './paths.ts';
import { useStopSearch, type StopSearchState } from './useStopSearch.ts';

function StopList({ stops }: { stops: readonly StopSummary[] }): ReactElement {
  if (stops.length === 0) return <p className="notice">No stops match.</p>;
  return (
    <ul className="stop-list">
      {stops.map((stop) => (
        <li key={stop.stopId}>
          <Link to={stopPath(stop.stopId)}>{stop.name ?? stop.stopId}</Link>
          {stop.code !== null && <span className="stop-code">Stop {stop.code}</span>}
        </li>
      ))}
    </ul>
  );
}

function Results({ state }: { state: StopSearchState }): ReactElement {
  if (state.status === 'idle') {
    return <p className="notice">Type part of a stop's name, or the number on the stop's pole.</p>;
  }
  if (state.status === 'searching') {
    return (
      <p className="notice" role="status">
        Searching.
      </p>
    );
  }
  if (state.status === 'failed') {
    return (
      <p className="notice" role="alert">
        Could not search the stops ({failureReason(state.error)}).
      </p>
    );
  }
  return <StopList stops={state.page.stops} />;
}

export function StopsPage(): ReactElement {
  const [search, setSearch] = useSearchParams();
  const text = search.get('q') ?? '';
  const onChange = useCallback(
    (next: string) => {
      setSearch(next === '' ? {} : { q: next }, { replace: true });
    },
    [setSearch],
  );
  return (
    <section className="stops">
      <h2>Find a stop</h2>
      <p>See which services are due at a stop, and how late each one is running.</p>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <SearchBox label="Stop name or number" name="stop" value={text} onChange={onChange} />
      </form>
      <Results state={useStopSearch(text)} />
    </section>
  );
}
