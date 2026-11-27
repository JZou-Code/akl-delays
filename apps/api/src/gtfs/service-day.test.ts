import { describe, expect, it } from 'vitest';
import { aucklandDate, previousDate, serviceDayStart, weekday } from './service-day.ts';

describe('aucklandDate', () => {
  it('gives the date in Auckland, not in UTC', () => {
    expect(aucklandDate(new Date('2026-11-26T11:30:00Z'))).toBe('20261127');
    expect(aucklandDate(new Date('2026-11-26T10:30:00Z'))).toBe('20261126');
  });
});

describe('previousDate', () => {
  it.each([
    ['20261127', '20261126'],
    ['20261201', '20261130'],
    ['20270101', '20261231'],
  ])('goes from %s to %s', (date, before) => {
    expect(previousDate(date)).toBe(before);
  });
});

describe('weekday', () => {
  it('counts from Monday', () => {
    expect(weekday('20261123')).toBe(0);
    expect(weekday('20261127')).toBe(4);
    expect(weekday('20261129')).toBe(6);
  });
});

describe('serviceDayStart', () => {
  it('is midnight in Auckland on a summer day', () => {
    expect(new Date(serviceDayStart('20261127') * 1000).toISOString()).toBe(
      '2026-11-26T11:00:00.000Z',
    );
  });

  it('is midnight in Auckland on a winter day', () => {
    expect(new Date(serviceDayStart('20260701') * 1000).toISOString()).toBe(
      '2026-06-30T12:00:00.000Z',
    );
  });

  it('is noon minus 12 hours on the day the clocks go forward', () => {
    // Clocks go from 2:00 to 3:00 on 27 September 2026, so midnight is 13 hours before noon.
    expect(new Date(serviceDayStart('20260927') * 1000).toISOString()).toBe(
      '2026-09-26T11:00:00.000Z',
    );
  });
});
