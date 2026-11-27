import { describe, expect, it } from 'vitest';
import { stopPath } from './paths.ts';

describe('stopPath', () => {
  it('builds the path of a stop page and encodes the id', () => {
    expect(stopPath('4227-0e16a7e9')).toBe('/stops/4227-0e16a7e9');
    expect(stopPath('a/b')).toBe('/stops/a%2Fb');
  });
});
