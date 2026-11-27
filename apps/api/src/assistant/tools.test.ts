import { beforeAll, describe, expect, it } from 'vitest';
import { loadFixtureBoard } from './fixture-board.ts';
import { BOARD_TOOLS, MAX_SERVICES, type AssistantTool, type BoardView } from './tools.ts';

const NOW = new Date('2026-11-20T08:30:00.000Z');

let board: BoardView;

beforeAll(async () => {
  board = await loadFixtureBoard(NOW);
});

function tool(name: string): AssistantTool {
  const found = BOARD_TOOLS.find((candidate) => candidate.definition.name === name);
  if (found === undefined) throw new Error(`no tool named ${name}`);
  return found;
}

function call(name: string, input: unknown, on: BoardView = board) {
  const outcome = tool(name).call(input, on);
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome;
}

describe('the tool definitions', () => {
  it('names the three tools', () => {
    expect(BOARD_TOOLS.map(({ definition }) => definition.name)).toEqual([
      'get_summary',
      'list_delays',
      'get_route',
    ]);
  });

  it('gives each tool a description and a closed object schema', () => {
    for (const { definition } of BOARD_TOOLS) {
      expect(definition.description).not.toBe('');
      expect(definition.input_schema).toMatchObject({
        type: 'object',
        additionalProperties: false,
      });
    }
  });

  it('writes the list_delays input as JSON Schema', () => {
    expect(tool('list_delays').definition.input_schema).toMatchObject({
      required: [],
      properties: {
        mode: { type: 'string', enum: ['bus', 'train', 'ferry'] },
        limit: { type: 'integer', minimum: 1, maximum: MAX_SERVICES },
      },
    });
  });

  it('requires the route of get_route', () => {
    expect(tool('get_route').definition.input_schema.required).toEqual(['route']);
  });
});

describe('get_summary', () => {
  it('counts the fixture by mode', () => {
    const { result, summary } = call('get_summary', {});

    expect(result).toMatchObject({
      stale: false,
      modes: {
        bus: { late: 3, very_late: 1, cancelled: 2, total: 13 },
        train: { on_time: 3, total: 4 },
        ferry: { late: 1, total: 2 },
      },
    });
    expect(summary).toBe('19 services');
  });

  it('passes on that the data is stale', () => {
    const { result } = call('get_summary', {}, { ...board, stale: true, feedSource: 'at' });

    expect(result).toMatchObject({ stale: true });
    expect(result).not.toHaveProperty('feedTimestamp');
    expect(result).not.toHaveProperty('feedSource');
  });
});

describe('list_delays', () => {
  it('returns the ten latest services when given nothing', () => {
    const { result, summary } = call('list_delays', {});

    expect(result).toMatchObject({ total: 20 });
    expect((result as { services: unknown[] }).services).toHaveLength(10);
    expect(summary).toBe('10 of 20 services');
  });

  it('cuts a service down to five fields and gives the delay in minutes', () => {
    const { result } = call('list_delays', { limit: 1 });

    expect(result).toEqual({
      total: 20,
      services: [
        { route: '373', mode: 'bus', status: 'very_late', delayMinutes: 46, stop: 'Smiths Avenue' },
      ],
    });
  });

  it('filters by mode and status', () => {
    const { result, summary } = call('list_delays', { mode: 'bus', status: 'cancelled' });

    expect(result).toMatchObject({
      total: 2,
      services: [
        { mode: 'bus', status: 'cancelled', delayMinutes: null },
        { mode: 'bus', status: 'cancelled', delayMinutes: null },
      ],
    });
    expect(summary).toBe('2 services');
  });

  it('sorts the way it is asked to', () => {
    const { result } = call('list_delays', {
      mode: 'train',
      sort: 'delay',
      order: 'asc',
      limit: 1,
    });

    expect(result).toMatchObject({ total: 4, services: [{ mode: 'train', status: 'early' }] });
  });

  it('returns every service at the limit of 20', () => {
    const { result } = call('list_delays', { limit: MAX_SERVICES });

    expect((result as { services: unknown[] }).services).toHaveLength(20);
  });

  it.each([{ limit: MAX_SERVICES + 1 }, { limit: 0 }, { mode: 'tram' }, { colour: 'red' }])(
    'refuses %o',
    (input) => {
      expect(tool('list_delays').call(input, board).ok).toBe(false);
    },
  );
});

describe('get_route', () => {
  it('finds a route by the name a rider uses', () => {
    const { result, summary } = call('get_route', { route: '373' });

    expect(result).toMatchObject({
      route: '373',
      mode: 'bus',
      total: 1,
      services: [{ status: 'very_late', delayMinutes: 46 }],
    });
    expect(summary).toBe('1 service');
  });

  it('ignores case and spaces around the name', () => {
    const upper = call('get_route', { route: ' S-C ' });
    const lower = call('get_route', { route: 's-c' });

    expect(upper.result).toMatchObject({ route: 'S-C', mode: 'train' });
    expect(lower.result).toEqual(upper.result);
  });

  it('says so when no service on the route is running', () => {
    const { result, summary } = call('get_route', { route: '999X' });

    expect(result).toMatchObject({ route: '999X', total: 0 });
    expect(summary).toBe('no running services');
  });

  it('refuses a call with no route', () => {
    expect(tool('get_route').call({}, board)).toMatchObject({ ok: false });
  });
});
