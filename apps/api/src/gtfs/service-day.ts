const TIME_ZONE = 'Pacific/Auckland';

const dateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const offsetName = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  timeZoneName: 'longOffset',
});

// Seconds that Auckland is ahead of UTC at this moment, such as 46800 in summer.
function offsetSeconds(at: Date): number {
  const name = offsetName.formatToParts(at).find((part) => part.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '');
  if (match === null) return 0;
  const seconds = Number(match[2]) * 3600 + Number(match[3]) * 60;
  return match[1] === '-' ? -seconds : seconds;
}

// The date in Auckland as GTFS writes it, such as 20261127.
export function aucklandDate(at: Date): string {
  return dateParts.format(at).replaceAll('-', '');
}

export function previousDate(date: string): string {
  const day = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8) - 1));
  return day.toISOString().slice(0, 10).replaceAll('-', '');
}

// Monday is 0, as in the column order of calendar.txt.
export function weekday(date: string): number {
  const day = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8)));
  return (day.getUTCDay() + 6) % 7;
}

// GTFS counts stop times from noon minus 12 hours, so a day with a clock change still lines up.
export function serviceDayStart(date: string): number {
  const noonUtc = Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8), 12) / 1000;
  const localNoon = noonUtc - offsetSeconds(new Date(noonUtc * 1000));
  return localNoon - 12 * 3600;
}
