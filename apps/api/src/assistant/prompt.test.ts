import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT, questionMessage } from './prompt.ts';
import type { BoardView } from './tools.ts';

function board(overrides: Partial<BoardView> = {}): BoardView {
  return {
    snapshot: {
      feedTimestamp: '2026-11-24T01:54:00.000Z',
      fetchedAt: '2026-11-24T01:54:05.000Z',
      services: [],
    },
    stale: false,
    feedSource: 'fixture',
    ...overrides,
  };
}

describe('questionMessage', () => {
  it('starts with the question as it was asked', () => {
    expect(questionMessage('Are the trains on time?', board())).toMatch(
      /^Are the trains on time\?\n\n/,
    );
  });

  it('says that fixture data is a recording', () => {
    expect(questionMessage('Q', board())).toContain(
      'Data source: a recording of the feed, not live data.',
    );
  });

  it('says that the AT feed is live', () => {
    expect(questionMessage('Q', board({ feedSource: 'at' }))).toContain(
      "Data source: Auckland Transport's live feed.",
    );
  });

  it('gives the feed time in Auckland time', () => {
    expect(questionMessage('Q', board())).toMatch(
      /Feed time: 24 Nov 2026, 2:54\spm, Auckland time\./,
    );
  });

  it('mentions stale data only when it is stale', () => {
    expect(questionMessage('Q', board())).not.toContain('stale');
    expect(questionMessage('Q', board({ stale: true }))).toContain('The data is stale');
  });
});

describe('SYSTEM_PROMPT', () => {
  it('holds nothing that changes between questions', () => {
    expect(SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
