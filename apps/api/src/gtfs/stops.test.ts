import { describe, expect, it } from 'vitest';
import { GtfsError } from './csv.ts';
import { parseStops } from './stops.ts';

describe('parseStops', () => {
  const header = 'stop_id,stop_code,stop_name,stop_lat,stop_lon';

  it('reads each stop with its name', () => {
    const stops = parseStops(
      [
        header,
        's1,1001,Britomart Train Station,-36.84,174.76',
        's2,1002,"Queen St, near Wellesley St",-36.85,174.76',
      ].join('\n'),
    );

    expect([...stops.values()]).toEqual([
      { stopId: 's1', name: 'Britomart Train Station', code: '1001' },
      { stopId: 's2', name: 'Queen St, near Wellesley St', code: '1002' },
    ]);
  });

  it('gives a null name when stop_name is empty or missing', () => {
    expect(parseStops([header, 's1,1001,,-36.84,174.76'].join('\n')).get('s1')?.name).toBeNull();
    expect(parseStops(['stop_id', 's1'].join('\n')).get('s1')?.name).toBeNull();
  });

  it('rejects an empty stop_id', () => {
    expect(() => parseStops([header, ',1001,Somewhere,-36.84,174.76'].join('\n'))).toThrow(
      new GtfsError('stops.txt row 1: stop_id is empty'),
    );
  });
});
