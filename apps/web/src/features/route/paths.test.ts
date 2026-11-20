import { describe, expect, it } from 'vitest';
import { routePath } from './paths.ts';

describe('routePath', () => {
  it('gives the page path of a route', () => {
    expect(routePath('NX1-901')).toBe('/routes/NX1-901');
  });

  it('encodes the route id', () => {
    expect(routePath('a/b c')).toBe('/routes/a%2Fb%20c');
  });
});
