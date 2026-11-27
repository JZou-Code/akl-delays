import { describe, expect, it } from 'vitest';
import { CHECK_CASES, checkOutcome, MAX_ANSWER_WORDS, type CheckCase } from './check.ts';
import type { AskOutcome } from './loop.ts';

const check: CheckCase = {
  question: 'How late is the 373?',
  tools: ['get_route', 'list_delays'],
  answer: [/\b46\b/, /late/i],
  absent: [/record/i],
};

function outcome(answer: string, tools: string[] = ['get_route']): AskOutcome {
  return {
    answer,
    steps: tools.map((tool) => ({ tool, input: {}, summary: '1 service' })),
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

describe('checkOutcome', () => {
  it('passes an answer that holds every pattern after an expected tool', () => {
    expect(checkOutcome(check, outcome('The 373 is 46 minutes late.'))).toEqual([]);
  });

  it('names the tools when none of the expected ones was called', () => {
    const problems = checkOutcome(check, outcome('46 minutes late.', ['get_summary']));

    expect(problems).toEqual(['called get_summary, expected get_route or list_delays']);
  });

  it('says so when no tool was called', () => {
    expect(checkOutcome(check, outcome('46 minutes late.', []))).toEqual([
      'called no tool, expected get_route or list_delays',
    ]);
  });

  it('names each pattern the answer misses', () => {
    expect(checkOutcome(check, outcome('The 373 is 45 minutes behind.'))).toEqual([
      'answer does not match /\\b46\\b/',
      'answer does not match /late/i',
    ]);
  });

  it('names a pattern the answer should not hold', () => {
    expect(checkOutcome(check, outcome('Recorded data: the 373 is 46 minutes late.'))).toEqual([
      'answer matches /record/i',
    ]);
  });

  it('does not match 46 inside a longer number', () => {
    expect(checkOutcome(check, outcome('146 minutes late.'))).toHaveLength(1);
  });

  it('accepts any tools for a case that names none', () => {
    const open: CheckCase = { question: 'Q', tools: [], answer: [/cannot/] };

    expect(checkOutcome(open, outcome('The board cannot answer that.', []))).toEqual([]);
  });

  it('flags an answer that is too long', () => {
    const long = `Late 46 ${'word '.repeat(MAX_ANSWER_WORDS)}`;

    expect(checkOutcome(check, outcome(long))).toEqual([
      `answer has ${MAX_ANSWER_WORDS + 2} words`,
    ]);
  });

  it.each(['**373**: 46 minutes late.', 'Late:\n- 373 is 46 minutes late', 'Late:\n1. 46'])(
    'flags markdown in %j',
    (answer) => {
      expect(checkOutcome(check, outcome(answer))).toEqual(['answer has markdown']);
    },
  );

  it('lets a route name with a dash through', () => {
    expect(checkOutcome(check, outcome('The S-C line is 46 minutes late.'))).toEqual([]);
  });
});

describe('CHECK_CASES', () => {
  it('holds eight different questions', () => {
    expect(new Set(CHECK_CASES.map(({ question }) => question)).size).toBe(8);
  });

  it('expects only tools that exist', () => {
    const known = ['get_summary', 'list_delays', 'get_route'];

    for (const { tools } of CHECK_CASES) expect(known).toEqual(expect.arrayContaining([...tools]));
  });

  it.each(['The 373 is 46 minutes late at 02:11 UTC.', 'At 2:32 pm the 373 is 46 minutes late.'])(
    'flags a time in %j',
    (answer) => {
      expect(checkOutcome(check, outcome(answer))).toEqual(['answer gives a time']);
    },
  );
});
