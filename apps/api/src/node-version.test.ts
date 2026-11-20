import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('node version', () => {
  it('is at least the major version in .nvmrc', async () => {
    const wanted = (await readFile(new URL('../../../.nvmrc', import.meta.url), 'utf8')).trim();
    const running = process.versions.node.split('.')[0];
    expect(Number(running)).toBeGreaterThanOrEqual(Number(wanted));
  });
});
