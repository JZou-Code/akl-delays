import { describe, expect, it } from 'vitest';
import { CallBudgetError, WEEKLY_CALL_LIMIT, checkCallBudget, weeklyCallCount } from './budget.ts';

describe('weeklyCallCount', () => {
  it.each([
    [60, 10_080],
    [30, 20_160],
    [18, 33_600],
    [17, 35_577],
  ])('gives %i seconds %i calls a week', (intervalSeconds, calls) => {
    expect(weeklyCallCount(intervalSeconds)).toBe(calls);
  });
});

describe('checkCallBudget', () => {
  it.each([60, 30, 18])('accepts a poll every %i seconds', (intervalSeconds) => {
    expect(() => checkCallBudget(intervalSeconds)).not.toThrow();
  });

  it.each([17, 10, 1])('refuses a poll every %i seconds', (intervalSeconds) => {
    expect(() => checkCallBudget(intervalSeconds)).toThrow(CallBudgetError);
  });

  it('says how many calls the interval makes and what the limit is', () => {
    expect(() => checkCallBudget(10)).toThrow(
      `polling every 10 seconds makes 60480 calls a week, over the limit of ${WEEKLY_CALL_LIMIT}`,
    );
  });
});
