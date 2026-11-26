import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const DEFAULT_GTFS_DIR = fileURLToPath(new URL('../../fixtures/gtfs', import.meta.url));

export type FeedConfig = { source: 'fixture' } | { source: 'at'; apiKey: string };

export const DEFAULT_ASSISTANT_MODEL = 'claude-haiku-5-5';

export interface AssistantConfig {
  apiKey: string;
  model: string;
  questionsPerHour: number;
}

export interface Config {
  port: number;
  feed: FeedConfig;
  // null when no Anthropic key is set. The ask feature is then off.
  assistant: AssistantConfig | null;
  pollIntervalSeconds: number;
  maxUpdateAgeSeconds: number;
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
  MAX_UPDATE_AGE_SECONDS: wholeNumber('MAX_UPDATE_AGE_SECONDS', 1, 86400).default(1200),
  GTFS_DIR: z.string().default(DEFAULT_GTFS_DIR),
  ANTHROPIC_API_KEY: z.string().optional(),
  ASSISTANT_MODEL: z.string().default(DEFAULT_ASSISTANT_MODEL),
  ASSISTANT_QUESTIONS_PER_HOUR: wholeNumber('ASSISTANT_QUESTIONS_PER_HOUR', 1, 1000).default(20),
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
  const { PORT, FEED_SOURCE, AT_API_KEY, POLL_INTERVAL_SECONDS, MAX_UPDATE_AGE_SECONDS, GTFS_DIR } =
    result.data;
  const { ANTHROPIC_API_KEY, ASSISTANT_MODEL, ASSISTANT_QUESTIONS_PER_HOUR } = result.data;
  return {
    port: PORT,
    feed: toFeedConfig(FEED_SOURCE, AT_API_KEY),
    assistant:
      ANTHROPIC_API_KEY === undefined
        ? null
        : {
            apiKey: ANTHROPIC_API_KEY,
            model: ASSISTANT_MODEL,
            questionsPerHour: ASSISTANT_QUESTIONS_PER_HOUR,
          },
    pollIntervalSeconds: POLL_INTERVAL_SECONDS,
    maxUpdateAgeSeconds: MAX_UPDATE_AGE_SECONDS,
    gtfsDir: GTFS_DIR,
  };
}
