import { describe, expect, it } from 'vitest';
import { formatAge, formatClock, modeLabel, statusLabel } from './format.ts';

describe('modeLabel', () => {
  it.each([
    ['bus', 'Bus'],
    ['train', 'Train'],
    ['ferry', 'Ferry'],
    [null, 'Unknown'],
  ] as const)('names %s as %s', (mode, label) => {
    expect(modeLabel(mode)).toBe(label);
  });
});

describe('statusLabel', () => {
  it.each([
    ['early', 'Early'],
    ['on_time', 'On time'],
    ['late', 'Late'],
    ['very_late', 'Very late'],
    ['cancelled', 'Cancelled'],
    ['unknown', 'No data'],
  ] as const)('names %s as %s', (status, label) => {
    expect(statusLabel(status)).toBe(label);
  });
});

describe('formatClock', () => {
  it('gives the time of day in the time zone it is given', () => {
    expect(formatClock('2026-11-19T19:00:00.000Z', 'en-NZ', 'Pacific/Auckland')).toBe('8:00:00 am');
  });

  it('follows the locale', () => {
    expect(formatClock('2026-11-19T19:00:00.000Z', 'en-GB', 'Pacific/Auckland')).toBe('08:00:00');
  });
});

describe('formatAge', () => {
  const at = '2026-11-19T19:00:05.000Z';
  const later = (seconds: number) => new Date(Date.parse(at) + seconds * 1000);

  it.each([
    [0, 'just now'],
    [0.9, 'just now'],
    [1, '1 second ago'],
    [12, '12 seconds ago'],
    [59, '59 seconds ago'],
    [60, '1 min ago'],
    [3599, '59 min ago'],
    [3600, '1 hour ago'],
    [7300, '2 hours ago'],
  ])('says %s seconds as %s', (seconds, text) => {
    expect(formatAge(at, later(seconds))).toBe(text);
  });

  it('says just now when the clock is behind the time given', () => {
    expect(formatAge(at, later(-30))).toBe('just now');
  });
});
