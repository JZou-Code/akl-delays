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
  it('is the question alone when the data is current', () => {
    expect(questionMessage('Are the trains on time?', board())).toBe('Are the trains on time?');
  });

  it('adds a note after the question when the data is stale', () => {
    expect(questionMessage('Are the trains on time?', board({ stale: true }))).toBe(
      'Are the trains on time?\n\nNote: the data is stale. The last fetches from the feed failed.',
    );
  });
});

describe('SYSTEM_PROMPT', () => {
  it('holds nothing that changes between questions', () => {
    expect(SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
