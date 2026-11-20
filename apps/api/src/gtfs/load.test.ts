import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { loadGtfs } from './load.ts';

const FIXTURE_DIR = fileURLToPath(new URL('../../fixtures/gtfs', import.meta.url));

describe('loadGtfs', () => {
  it('reads routes.txt from the given folder', async () => {
    const readText = vi.fn(() =>
      Promise.resolve('route_id,route_short_name,route_type\nr1,NX1,3\n'),
    );

    const gtfs = await loadGtfs('/data/gtfs', readText);

    expect(readText).toHaveBeenCalledWith(join('/data/gtfs', 'routes.txt'));
    expect(gtfs.route('r1')).toEqual({ routeId: 'r1', name: 'NX1', mode: 'bus' });
    expect(gtfs.route('r2')).toBeUndefined();
  });

  it('loads the fixture routes for every mode', async () => {
    const gtfs = await loadGtfs(FIXTURE_DIR, (path) => readFile(path, 'utf8'));

    expect(gtfs.route('NX1-901')).toEqual({ routeId: 'NX1-901', name: 'NX1', mode: 'bus' });
    expect(gtfs.route('EAST-901')?.mode).toBe('train');
    expect(gtfs.route('DEV-901')?.mode).toBe('ferry');
  });

  it('leaves route 66-901 out of the fixture, so the feed has a route it cannot name', async () => {
    const gtfs = await loadGtfs(FIXTURE_DIR, (path) => readFile(path, 'utf8'));

    expect(gtfs.route('66-901')).toBeUndefined();
  });
});
