import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { loadGtfs } from './load.ts';

const FIXTURE_DIR = fileURLToPath(new URL('../../fixtures/gtfs', import.meta.url));

function loadFixture() {
  return loadGtfs(FIXTURE_DIR, (path) => readFile(path, 'utf8'));
}

describe('loadGtfs', () => {
  it('reads routes.txt and stops.txt from the given folder', async () => {
    const files: Record<string, string> = {
      [join('/data/gtfs', 'routes.txt')]: 'route_id,route_short_name,route_type\nr1,NX1,3\n',
      [join('/data/gtfs', 'stops.txt')]: 'stop_id,stop_name\ns1,Britomart\n',
    };
    const readText = vi.fn((path: string) => Promise.resolve(files[path] ?? ''));

    const gtfs = await loadGtfs('/data/gtfs', readText);

    expect(readText).toHaveBeenCalledTimes(2);
    expect(gtfs.route('r1')).toEqual({ routeId: 'r1', name: 'NX1', mode: 'bus' });
    expect(gtfs.stop('s1')).toEqual({ stopId: 's1', name: 'Britomart' });
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

  it('has no route S094-217, a school bus the real routes.txt does not list', async () => {
    const gtfs = await loadFixture();

    expect(gtfs.route('S094-217')).toBeUndefined();
  });
});
