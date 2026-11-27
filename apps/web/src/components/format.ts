import type { DelayStatus, Mode } from '@akl-delays/shared';

const MODE_LABELS: Record<Mode, string> = { bus: 'Bus', train: 'Train', ferry: 'Ferry' };

const STATUS_LABELS: Record<DelayStatus, string> = {
  early: 'Early',
  on_time: 'On time',
  late: 'Late',
  very_late: 'Very late',
  cancelled: 'Cancelled',
  unknown: 'No data',
};

export function modeLabel(mode: Mode | null): string {
  return mode === null ? 'Unknown' : MODE_LABELS[mode];
}

export function statusLabel(status: DelayStatus): string {
  return STATUS_LABELS[status];
}

export function formatDelay(delaySeconds: number | null, status: DelayStatus): string {
  if (status === 'cancelled') return 'cancelled';
  if (delaySeconds === null) return 'no data';
  const minutes = Math.round(delaySeconds / 60);
  if (minutes === 0) return 'on time';
  return minutes > 0 ? `${minutes} min late` : `${-minutes} min early`;
}

export function formatClock(iso: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'medium', timeZone }).format(new Date(iso));
}

// Hours and minutes, for a time a rider reads off a list.
export function formatTime(iso: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(new Date(iso));
}

// How long until a time, in whole minutes. A time that has come is due.
export function formatWait(iso: string, now: Date): string {
  const minutes = Math.round((Date.parse(iso) - now.getTime()) / 60_000);
  return minutes <= 0 ? 'due' : `${minutes} min`;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function formatAge(iso: string, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 1000));
  if (seconds === 0) return 'just now';
  if (seconds < 60) return `${plural(seconds, 'second', 'seconds')} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${plural(Math.floor(minutes / 60), 'hour', 'hours')} ago`;
}
