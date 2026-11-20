import type { DelayStatus } from '@akl-delays/shared';
import { describe, expect, it } from 'vitest';
import { delayStatus } from './status.ts';

describe('delayStatus', () => {
  it.each<[number, DelayStatus]>([
    [-600, 'early'],
    [-61, 'early'],
    [-60, 'on_time'],
    [0, 'on_time'],
    [300, 'on_time'],
    [301, 'late'],
    [900, 'late'],
    [901, 'very_late'],
    [3600, 'very_late'],
  ])('gives %i seconds the status %s', (delaySeconds, status) => {
    expect(delayStatus({ delaySeconds, cancelled: false })).toBe(status);
  });

  it('gives unknown when there is no delay value', () => {
    expect(delayStatus({ delaySeconds: null, cancelled: false })).toBe('unknown');
  });

  it('gives cancelled for a cancelled trip, whatever the delay', () => {
    expect(delayStatus({ delaySeconds: 1200, cancelled: true })).toBe('cancelled');
    expect(delayStatus({ delaySeconds: null, cancelled: true })).toBe('cancelled');
  });
});
