import { describe, expect, it } from 'vitest';
import { destination } from './destination.ts';

describe('destination', () => {
  it.each([
    ['Britomart (Lower Albert St) To Hibiscus Coast Station', 'Hibiscus Coast Station'],
    ['Red Hill to Papakura Shops', 'Papakura Shops'],
    ['Takapuna To Massey University Via Browns Bay', 'Massey University Via Browns Bay'],
    ['Devonport', 'Devonport'],
  ])('reads %s as %s', (headsign, to) => {
    expect(destination(headsign)).toBe(to);
  });

  it('says Unknown with no headsign', () => {
    expect(destination(null)).toBe('Unknown');
  });
});
