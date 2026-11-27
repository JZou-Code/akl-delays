import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { loadGtfs } from './load.ts';

const FIXTURE_DIR = fileURLToPath(new URL('../../fixtures/gtfs', import.meta.url));

// A file that is not in the map is missing, as readFile reports it.
function reading(files: Record<string, string>) {
  return (path: string): Promise<string> => {
    const text = files[path];
    if (text !== undefined) return Promise.resolve(text);
    return Promise.reject(Object.assign(new Error(`no such file: ${path}`), { code: 'ENOENT' }));
  };
}

function loadFixture() {
  return loadGtfs(FIXTURE_DIR, (path) => readFile(path, 'utf8'));
}

describe('loadGtfs', () => {
  it('reads routes.txt and stops.txt from the given folder', async () => {
    const files: Record<string, string> = {
      [join('/data/gtfs', 'routes.txt')]: 'route_id,route_short_name,route_type\nr1,NX1,3\n',
      [join('/data/gtfs', 'stops.txt')]: 'stop_id,stop_name\ns1,Britomart\n',
    };
    const readText = vi.fn(reading(files));

    const gtfs = await loadGtfs('/data/gtfs', readText);

    expect(gtfs.timetable).toBeNull();
    expect(gtfs.stops()).toEqual([{ stopId: 's1', name: 'Britomart', code: null }]);
    expect(gtfs.route('r1')).toEqual({ routeId: 'r1', name: 'NX1', mode: 'bus' });
    expect(gtfs.stop('s1')).toEqual({ stopId: 's1', name: 'Britomart', code: null });
    expect(gtfs.route('r2')).toBeUndefined();
    expect(gtfs.stop('s2')).toBeUndefined();
  });

  it('loads the fixture routes for every mode', async () => {
    const gtfs = await loadFixture();

    expect(gtfs.route('373-203')).toEqual({ routeId: '373-203', name: '373', mode: 'bus' });
    expect(gtfs.route('S-C-201')?.mode).toBe('train');
    expect(gtfs.route('MTIA-209')?.mode).toBe('ferry');
  });

  it('loads the fixture stops', async () => {
    const gtfs = await loadFixture();

    expect(gtfs.stop('9705-54050269')?.name).toBe('Downtown Ferry Terminal Pier 5');
    expect(gtfs.stop('2616-316a3b84')?.name).toBe('Smiths Avenue');
  });

  it('names S094-217, a school bus the real routes.txt does not list, from its id', async () => {
    const gtfs = await loadFixture();

    expect(gtfs.route('S094-217')).toEqual({ routeId: 'S094-217', name: 'S094', mode: 'bus' });
    expect(gtfs.route('NOPE-1')).toBeUndefined();
  });

  it('loads the timetable when the folder has stop_times.txt', async () => {
    const { timetable } = await loadFixture();

    expect(timetable?.trip('1046-37303-49740-2-a7fba600')).toMatchObject({
      routeId: '373-203',
      headsign: expect.any(String) as string,
    });
    expect(timetable?.tripsAt('2616-316a3b84').length).toBeGreaterThan(0);
  });

  it('fails when stop_times.txt is there but trips.txt is not', async () => {
    const files = {
      [join('/data/gtfs', 'routes.txt')]: 'route_id,route_short_name,route_type\nr1,NX1,3\n',
      [join('/data/gtfs', 'stops.txt')]: 'stop_id,stop_name\ns1,Britomart\n',
      [join('/data/gtfs', 'stop_times.txt')]:
        'trip_id,arrival_time,departure_time,stop_id,stop_sequence\n',
    };

    await expect(loadGtfs('/data/gtfs', reading(files))).rejects.toThrow(/no such file/);
  });

  it('passes on a read error that is not a missing file', async () => {
    const readText = (path: string) =>
      path.endsWith('stop_times.txt')
        ? Promise.reject(new Error('disk failed'))
        : Promise.resolve('route_id,route_type\nr1,3\n');

    await expect(loadGtfs('/data/gtfs', readText)).rejects.toThrow('disk failed');
  });
});
