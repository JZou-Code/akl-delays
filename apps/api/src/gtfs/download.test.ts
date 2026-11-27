import { join } from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { GtfsError } from './csv.ts';
import { AT_GTFS_URL, downloadGtfs } from './download.ts';

const ROUTES = 'route_id,route_short_name,route_type\n32-203,32,3\n';
const STOPS = 'stop_id,stop_name\n1775-79982353,Mangere Town Centre\n';
const TIMETABLE = {
  'trips.txt': 'route_id,service_id,trip_id\n32-203,Weekday-1,t1\n',
  'calendar.txt': 'service_id\nWeekday-1\n',
  'calendar_dates.txt': 'service_id,date,exception_type\n',
  'stop_times.txt': 'trip_id\nt1\n',
};
const ALL = { 'routes.txt': ROUTES, 'stops.txt': STOPS, ...TIMETABLE };

function zipOf(files: Record<string, string>): Uint8Array {
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])),
  );
}

function setup(response: Response | Error) {
  const fetch = vi.fn<typeof globalThis.fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  const written = new Map<string, string>();
  const writeFile = (path: string, data: Uint8Array) => {
    written.set(path, new TextDecoder().decode(data));
    return Promise.resolve();
  };
  return { fetch, written, run: () => downloadGtfs({ dir: '/data/gtfs', fetch, writeFile }) };
}

function zipResponse(files: Record<string, string>): Response {
  return new Response(zipOf(files));
}

describe('downloadGtfs', () => {
  it('writes the six files from the zip and returns their paths', async () => {
    const { run, written } = setup(zipResponse(ALL));

    const paths = await run();

    expect(paths).toEqual(Object.keys(ALL).map((name) => join('/data/gtfs', name)));
    expect(written.get(join('/data/gtfs', 'stop_times.txt'))).toBe(TIMETABLE['stop_times.txt']);
    expect(written.get(join('/data/gtfs', 'routes.txt'))).toBe(ROUTES);
    expect(written.get(join('/data/gtfs', 'stops.txt'))).toBe(STOPS);
  });

  it('leaves the other files in the zip alone', async () => {
    const { run, written } = setup(zipResponse({ ...ALL, 'shapes.txt': 'shape_id\n' }));

    await run();

    expect([...written.keys()]).toHaveLength(6);
  });

  it('asks the AT address by default', async () => {
    const { run, fetch } = setup(zipResponse(ALL));

    await run();

    expect(fetch.mock.calls[0]?.[0]).toBe(AT_GTFS_URL);
  });

  it('names the file the zip does not have and writes nothing', async () => {
    const { run, written } = setup(zipResponse({ 'routes.txt': ROUTES, ...TIMETABLE }));

    await expect(run()).rejects.toThrow(new GtfsError('GTFS zip has no stops.txt'));
    expect(written.size).toBe(0);
  });

  it('reports an HTTP error', async () => {
    const { run } = setup(new Response('gone', { status: 404 }));

    await expect(run()).rejects.toThrow(new GtfsError('GTFS download answered HTTP 404'));
  });

  it('reports a failed request', async () => {
    const { run } = setup(new TypeError('fetch failed'));

    await expect(run()).rejects.toThrow(new GtfsError('GTFS download failed: fetch failed'));
  });

  it('reports a body that is not a zip file', async () => {
    const { run } = setup(new Response('<html>maintenance</html>'));

    await expect(run()).rejects.toThrow(/^GTFS download is not a zip file/);
  });
});
