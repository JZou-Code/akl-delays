export const WEEKLY_CALL_LIMIT = 35_000;

const SECONDS_PER_WEEK = 7 * 24 * 60 * 60;

export class CallBudgetError extends Error {
  override name = 'CallBudgetError';
}

export function weeklyCallCount(intervalSeconds: number): number {
  return Math.ceil(SECONDS_PER_WEEK / intervalSeconds);
}

export function checkCallBudget(intervalSeconds: number): void {
  const calls = weeklyCallCount(intervalSeconds);
  if (calls > WEEKLY_CALL_LIMIT) {
    throw new CallBudgetError(
      `polling every ${intervalSeconds} seconds makes ${calls} calls a week, over the limit of ${WEEKLY_CALL_LIMIT}`,
    );
  }
}
