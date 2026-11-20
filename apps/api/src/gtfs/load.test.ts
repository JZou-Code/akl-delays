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

    expect(gtfs.route('NX1-901')).toEqual({ routeId: 'NX1-901', name: 'NX1', mode: 'bus' });
    expect(gtfs.route('EAST-901')?.mode).toBe('train');
    expect(gtfs.route('DEV-901')?.mode).toBe('ferry');
  });

  it('loads the fixture stops, including a quoted name', async () => {
    const gtfs = await loadFixture();

    expect(gtfs.stop('4015-901')?.name).toBe('Downtown Ferry Terminal Pier 1');
    expect(gtfs.stop('4003-901')?.name).toBe('Britomart, Lower Albert St');
  });

  it('leaves route 66-901 and stop 4099-901 out of the fixture, so the feed has ids it cannot name', async () => {
    const gtfs = await loadFixture();

    expect(gtfs.route('66-901')).toBeUndefined();
    expect(gtfs.stop('4099-901')).toBeUndefined();
  });
});
