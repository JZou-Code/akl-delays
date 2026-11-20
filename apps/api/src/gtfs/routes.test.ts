import type { Mode } from '@akl-delays/shared';
import { describe, expect, it } from 'vitest';
import { GtfsError } from './csv.ts';
import { modeFromRouteType, parseRoutes } from './routes.ts';

describe('modeFromRouteType', () => {
  it.each<[number, Mode | null]>([
    [2, 'train'],
    [3, 'bus'],
    [4, 'ferry'],
    [0, null],
    [5, null],
    [715, null],
  ])('maps route_type %i to %s', (routeType, mode) => {
    expect(modeFromRouteType(routeType)).toBe(mode);
  });
});

describe('parseRoutes', () => {
  const header = 'route_id,route_short_name,route_long_name,route_type';

  it('reads each route with its name and mode', () => {
    const routes = parseRoutes(
      [header, 'r1,NX1,Northern Express,3', 'r2,EAST,Eastern Line,2', 'r3,DEV,Devonport,4'].join(
        '\n',
      ),
    );

    expect([...routes.values()]).toEqual([
      { routeId: 'r1', name: 'NX1', mode: 'bus' },
      { routeId: 'r2', name: 'EAST', mode: 'train' },
      { routeId: 'r3', name: 'DEV', mode: 'ferry' },
    ]);
  });

  it('uses the long name when the short name is empty', () => {
    const routes = parseRoutes([header, 'r1,,Outer Link,3'].join('\n'));

    expect(routes.get('r1')?.name).toBe('Outer Link');
  });

  it('gives a null name when both names are empty', () => {
    expect(parseRoutes([header, 'r1,,,3'].join('\n')).get('r1')?.name).toBeNull();
  });

  it('reads quoted fields that hold commas and quotes', () => {
    const routes = parseRoutes([header, 'r1,,"Botany, via ""Ti Rakau"" Dr",3'].join('\n'));

    expect(routes.get('r1')?.name).toBe('Botany, via "Ti Rakau" Dr');
  });

  it('reads columns in any order and ignores extra columns', () => {
    const routes = parseRoutes(['route_type,route_color,route_id', '2,FF0000,r1'].join('\n'));

    expect(routes.get('r1')).toEqual({ routeId: 'r1', name: null, mode: 'train' });
  });

  it('reads a file with a byte order mark, CRLF line ends and a blank last line', () => {
    const routes = parseRoutes(`\uFEFF${header}\r\nr1,70,Botany,3\r\n\r\n`);

    expect(routes.get('r1')?.mode).toBe('bus');
  });

  it('rejects a route_type that is not a whole number', () => {
    const text = [header, 'r1,NX1,,3', 'r2,70,,bus'].join('\n');

    expect(() => parseRoutes(text)).toThrow(
      new GtfsError('routes.txt row 2: route_type must be a whole number'),
    );
  });

  it('rejects a file without a route_id column', () => {
    expect(() => parseRoutes(['route_short_name,route_type', 'NX1,3'].join('\n'))).toThrow(
      'routes.txt row 1: route_id is missing',
    );
  });

  it('rejects a file that is not valid CSV', () => {
    expect(() => parseRoutes([header, 'r1,"NX1,,3'].join('\n'))).toThrow(
      /^routes\.txt is not valid CSV/,
    );
  });
});
