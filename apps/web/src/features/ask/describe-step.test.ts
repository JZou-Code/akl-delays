import { describe, expect, it } from 'vitest';
import { describeStep } from './describe-step.ts';

function step(tool: string, input: Record<string, unknown> = {}) {
  return { tool, input, summary: '' };
}

describe('describeStep', () => {
  it('describes the summary', () => {
    expect(describeStep(step('get_summary'))).toBe('Counted the services on the board');
  });

  it('describes a route lookup by the route name', () => {
    expect(describeStep(step('get_route', { route: 'NX1' }))).toBe('Looked up route NX1');
  });

  it.each([
    [{}, 'Looked at services'],
    [{ mode: 'bus' }, 'Looked at buses'],
    [{ mode: 'ferry', status: 'late' }, 'Looked at late ferries'],
    [{ status: 'cancelled', limit: 20 }, 'Looked at cancelled services'],
    [{ status: 'on_time', mode: 'train' }, 'Looked at on-time trains'],
    [{ status: 'unknown' }, 'Looked at services with no data'],
    [{ q: 'Newmarket' }, 'Looked at services matching "Newmarket"'],
    [
      { mode: 'bus', sort: 'delay', order: 'desc', limit: 10 },
      'Looked at buses, most delayed first',
    ],
    [{ order: 'asc' }, 'Looked at services, least delayed first'],
    [{ sort: 'route', order: 'asc' }, 'Looked at services, sorted by route'],
  ])('describes list_delays with %j', (input, expected) => {
    expect(describeStep(step('list_delays', input))).toBe(expected);
  });

  it('leaves the limit out', () => {
    expect(describeStep(step('list_delays', { limit: 5 }))).not.toMatch(/5/);
  });

  it('keeps the name of a tool it does not know', () => {
    expect(describeStep(step('get_history', { route: '70' }))).toBe('get_history');
  });
});
