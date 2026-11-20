import type { DelayStatus } from '@akl-delays/shared';
import { THRESHOLDS } from './thresholds.ts';

export interface DelayFacts {
  delaySeconds: number | null;
  cancelled: boolean;
}

export function delayStatus({ delaySeconds, cancelled }: DelayFacts): DelayStatus {
  if (cancelled) return 'cancelled';
  if (delaySeconds === null) return 'unknown';
  if (delaySeconds < -THRESHOLDS.earlySeconds) return 'early';
  if (delaySeconds <= THRESHOLDS.lateSeconds) return 'on_time';
  if (delaySeconds <= THRESHOLDS.veryLateSeconds) return 'late';
  return 'very_late';
}
