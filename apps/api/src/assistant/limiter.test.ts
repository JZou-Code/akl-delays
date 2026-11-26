import { describe, expect, it } from 'vitest';
import { createHourlyLimiter } from './limiter.ts';

function setup(perHour: number) {
  let time = Date.parse('2026-11-27T02:00:00.000Z');
  const limiter = createHourlyLimiter({ perHour, now: () => new Date(time) });
  return {
    limiter,
    wait: (minutes: number) => {
      time += minutes * 60_000;
    },
  };
}

describe('createHourlyLimiter', () => {
  it('lets through as many questions as the limit', () => {
    const { limiter } = setup(3);

    expect([limiter.take(), limiter.take(), limiter.take()]).toEqual([true, true, true]);
  });

  it('refuses the question over the limit', () => {
    const { limiter } = setup(2);
    limiter.take();
    limiter.take();

    expect(limiter.take()).toBe(false);
  });

  it('does not count a refused question', () => {
    const { limiter, wait } = setup(1);
    limiter.take();
    wait(30);
    limiter.take();
    wait(30);

    expect(limiter.take()).toBe(true);
  });

  it('still refuses just under an hour after the first question', () => {
    const { limiter, wait } = setup(1);
    limiter.take();
    wait(59);

    expect(limiter.take()).toBe(false);
  });

  it('makes room as each question turns an hour old', () => {
    const { limiter, wait } = setup(2);
    limiter.take();
    wait(40);
    limiter.take();
    wait(20);

    expect([limiter.take(), limiter.take()]).toEqual([true, false]);
  });
});
