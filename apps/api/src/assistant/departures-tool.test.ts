import { beforeAll, describe, expect, it } from 'vitest';
import { loadFixtureBoard, type FixtureBoard } from './fixture-board.ts';

const NOW = new Date('2026-11-20T08:30:00.000Z');

let board: FixtureBoard;

beforeAll(async () => {
  board = await loadFixtureBoard(NOW);
});

function call(input: unknown) {
  const tool = board.tools.find(({ definition }) => definition.name === 'get_departures');
  if (tool === undefined) throw new Error('the fixture has no departures tool');
  const outcome = tool.call(input, board);
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome;
}

describe('get_departures', () => {
  it('is the fourth tool when a timetable is loaded', () => {
    expect(board.tools.map(({ definition }) => definition.name)).toEqual([
      'get_summary',
      'list_delays',
      'get_route',
      'get_departures',
    ]);
  });

  it('lists what is due at a stop found by its number', () => {
    const { result, summary } = call({ stop: '2521' });

    expect(result).toMatchObject({
      stop: { name: 'Central Park Reserve', number: '2521' },
      departures: [
        {
          route: '373',
          to: 'Papakura Shops',
          status: 'very_late',
          delayMinutes: 46,
          minutesAway: 0,
        },
      ],
    });
    expect(summary).toBe('1 departure');
  });

  it('gives the due time and the timetable time as Auckland clock times', () => {
    const { result } = call({ stop: 'Central Park Reserve' });
    const [first] = (result as { departures: { due: string; scheduled: string }[] }).departures;

    expect(first?.due).toMatch(/^\d{1,2}:\d{2}\s[ap]m$/);
    expect(first?.scheduled).toMatch(/^\d{1,2}:\d{2}\s[ap]m$/);
    expect(first?.due).not.toBe(first?.scheduled);
  });

  it('keeps only the route asked for', () => {
    expect(call({ stop: '2521', route: '373' }).summary).toBe('1 departure');
    expect(call({ stop: '2521', route: 'NX' })).toMatchObject({
      result: { departures: [] },
      summary: '0 departures',
    });
  });

  it('lists the stops and no departures when several match', () => {
    const { result, summary } = call({ stop: 'road' });

    expect(result).toMatchObject({ note: 'Several stops match. No departures were looked up.' });
    expect((result as { stops: unknown[] }).stops).toHaveLength(6);
    expect(result).not.toHaveProperty('departures');
    expect(summary).toBe('6 stops match');
  });

  it('says so when no stop matches', () => {
    expect(call({ stop: 'zzzz' })).toMatchObject({
      result: { note: 'No stop has this name or number.' },
      summary: 'no stop found',
    });
  });

  it('refuses a call with no stop', () => {
    const tool = board.tools.find(({ definition }) => definition.name === 'get_departures');

    expect(tool?.call({}, board)).toMatchObject({ ok: false });
  });
});
