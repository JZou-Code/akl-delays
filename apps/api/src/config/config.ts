import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const DEFAULT_GTFS_DIR = fileURLToPath(new URL('../../fixtures/gtfs', import.meta.url));

export type FeedConfig = { source: 'fixture' } | { source: 'at'; apiKey: string };

export interface Config {
  port: number;
  feed: FeedConfig;
  pollIntervalSeconds: number;
  gtfsDir: string;
}

export type Env = Readonly<Record<string, string | undefined>>;

export class ConfigError extends Error {
  override name = 'ConfigError';
}

function wholeNumber(name: string, min: number, max: number) {
  const message = `${name} must be a whole number from ${min} to ${max}`;
  return z
    .string()
    .regex(/^\d+$/, message)
    .transform(Number)
    .refine((value) => value >= min && value <= max, message);
}

const envSchema = z.object({
  PORT: wholeNumber('PORT', 1, 65535).default(3000),
  FEED_SOURCE: z
    .enum(['fixture', 'at'], { error: 'FEED_SOURCE must be fixture or at' })
    .default('fixture'),
  AT_API_KEY: z.string().optional(),
  POLL_INTERVAL_SECONDS: wholeNumber('POLL_INTERVAL_SECONDS', 1, 86400).default(60),
  GTFS_DIR: z.string().default(DEFAULT_GTFS_DIR),
});

function toFeedConfig(source: 'fixture' | 'at', apiKey: string | undefined): FeedConfig {
  if (source === 'fixture') return { source };
  if (apiKey === undefined) throw new ConfigError('AT_API_KEY is required when FEED_SOURCE=at');
  return { source, apiKey };
}

export function loadConfig(env: Env): Config {
  const set = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
  const result = envSchema.safeParse(set);
  if (!result.success) {
    throw new ConfigError(result.error.issues.map((issue) => issue.message).join('; '));
  }
  const { PORT, FEED_SOURCE, AT_API_KEY, POLL_INTERVAL_SECONDS, GTFS_DIR } = result.data;
  return {
    port: PORT,
    feed: toFeedConfig(FEED_SOURCE, AT_API_KEY),
    pollIntervalSeconds: POLL_INTERVAL_SECONDS,
    gtfsDir: GTFS_DIR,
  };
}
