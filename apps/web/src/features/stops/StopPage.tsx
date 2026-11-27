import type { StopDepartures } from '@akl-delays/shared';
import { useCallback, type ReactElement } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { isNotFound } from '../../api/index.ts';
import { LoadNotice, SearchBox } from '../../components/index.ts';
import { useNow, type Polling } from '../../hooks/index.ts';
import { DepartureTable } from './DepartureTable.tsx';
import { STOPS_PATH } from './paths.ts';
import { useDepartures } from './useDepartures.ts';

const NOW_INTERVAL_MS = 15_000;

function emptyText(route: string): string {
  return route === ''
    ? 'No services are due at this stop in the next hour.'
    : `No services on a route starting with ${route} are due at this stop in the next hour.`;
}

function Body({ polling, route }: { polling: Polling<StopDepartures>; route: string }) {
  const now = useNow(NOW_INTERVAL_MS);
  const { data, error, loading } = polling;
  if (data === undefined) return <LoadNotice loading={loading} error={error} />;
  return (
    <>
      {error !== undefined && <LoadNotice loading={false} error={error} />}
      {data.departures.length === 0 ? (
        <p className="notice">{emptyText(route)}</p>
      ) : (
        <DepartureTable departures={data.departures} now={now} />
      )}
      <p className="stop-note">
        The due time is the timetable's time moved by how late the service is running now. A service
        marked Scheduled has not reported yet, so its due time is the timetable's time.
      </p>
    </>
  );
}

export function StopPage(): ReactElement {
  const { stopId = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const route = search.get('route') ?? '';
  const polling = useDepartures(stopId, route);
  const onRoute = useCallback(
    (next: string) => {
      setSearch(next === '' ? {} : { route: next }, { replace: true });
    },
    [setSearch],
  );
  const stop = polling.data?.stop;

  if (isNotFound(polling.error)) {
    return (
      <section className="stop-page">
        <h2>Stop not found</h2>
        <p className="notice">No stop has this id.</p>
        <p>
          <Link to={STOPS_PATH}>Find a stop</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="stop-page">
      <h2>{stop?.name ?? 'Stop'}</h2>
      {stop !== undefined && stop.code !== null && <p className="stop-code">Stop {stop.code}</p>}
      <form
        className="filters"
        aria-label="Filter the services"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <SearchBox label="Route" name="route" value={route} onChange={onRoute} />
      </form>
      <Body polling={polling} route={route} />
      <p>
        <Link to={STOPS_PATH}>Find another stop</Link>
      </p>
    </section>
  );
}
