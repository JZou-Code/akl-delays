import { describe, expect, it } from 'vitest';
import { apiProxyTarget } from './dev-server.ts';

describe('apiProxyTarget', () => {
  it('sends /api to the port the API listens on', () => {
    expect(apiProxyTarget({ PORT: '3987' })).toBe('http://localhost:3987');
  });

  it('uses the API default port when PORT is not set or empty', () => {
    expect(apiProxyTarget({})).toBe('http://localhost:3000');
    expect(apiProxyTarget({ PORT: '' })).toBe('http://localhost:3000');
  });

  it.each(['0', '65536', 'abc', '30.5', '-1'])('refuses PORT=%s', (port) => {
    expect(() => apiProxyTarget({ PORT: port })).toThrow(
      'PORT must be a whole number from 1 to 65535',
    );
  });
});
