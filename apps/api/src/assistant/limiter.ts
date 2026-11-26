const HOUR_MS = 60 * 60 * 1000;

export interface Limiter {
  // Counts one question when there is room for it and says whether there was.
  take: () => boolean;
}

export interface HourlyLimiterOptions {
  perHour: number;
  now: () => Date;
}

// The count lives in memory, so a restart clears it.
export function createHourlyLimiter({ perHour, now }: HourlyLimiterOptions): Limiter {
  let taken: number[] = [];
  return {
    take: () => {
      const at = now().getTime();
      taken = taken.filter((earlier) => at - earlier < HOUR_MS);
      if (taken.length >= perHour) return false;
      taken.push(at);
      return true;
    },
  };
}
