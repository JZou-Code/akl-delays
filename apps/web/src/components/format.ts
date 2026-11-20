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

export function formatClock(iso: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'medium', timeZone }).format(new Date(iso));
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
