import type { StopSummary } from '@akl-delays/shared';
import { describe, expect, it } from 'vitest';
import { searchStops } from './stops.ts';

const stops: StopSummary[] = [
  { stopId: 'a', code: '4227', name: 'Stop C Albany Bus Station' },
  { stopId: 'b', code: '4225', name: 'Stop A Albany Bus Station' },
  { stopId: 'c', code: '7136', name: 'Albany Highway/Bass Road' },
  { stopId: 'd', code: '100', name: 'Papatoetoe Train Station' },
  { stopId: 'e', code: '1003', name: 'Stop B Lower Albert' },
  { stopId: 'f', code: null, name: null },
];

function found(text: string, limit?: number): string[] {
  return searchStops({ stops, hasTrips: (stopId) => stopId !== 'd', text, limit }).map(
    (stop) => stop.stopId,
  );
}

describe('searchStops', () => {
  it('finds stops whose name holds the text, ignoring case', () => {
    expect(found('ALBANY')).toEqual(['c', 'b', 'a']);
  });

  it('needs every word, in any order', () => {
    expect(found('station albany')).toEqual(['b', 'a']);
    expect(found('albany wharf')).toEqual([]);
  });

  it('finds a stop by the start of its code and puts an exact code first', () => {
    expect(found('422')).toEqual(['b', 'a']);
    expect(found('1003')).toEqual(['e']);
  });

  it('puts names that start with the text before the rest', () => {
    expect(found('stop')).toEqual(['b', 'e', 'a']);
  });

  it('leaves out a stop that no trip calls at', () => {
    expect(found('papatoetoe')).toEqual([]);
  });

  it('gives nothing for blank text', () => {
    expect(found('  ')).toEqual([]);
  });

  it('stops at the limit', () => {
    expect(found('albany', 2)).toEqual(['c', 'b']);
  });
});
