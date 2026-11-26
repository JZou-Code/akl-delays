import type { Express } from 'express';
import {
  BOARD_TOOLS,
  createAnthropicClient,
  createAssistant,
  createHourlyLimiter,
  type Assistant,
} from './assistant/index.ts';
import type { Config } from './config/index.ts';
import {
  AtFeedSource,
  FIXTURE_FEED_PATH,
  FixtureFeedSource,
  type FeedSource,
  type Fetch,
  type ReadText,
} from './feed/index.ts';
import { loadGtfs } from './gtfs/index.ts';
import { createApp } from './http/index.ts';
import { createPoller, type Poller, type Schedule } from './poller/index.ts';
import { createMemoryStore, type Store } from './store/index.ts';

export interface Deps {
  readText: ReadText;
  fetch: Fetch;
  now: () => Date;
  schedule: Schedule;
  log: (line: string) => void;
}

export interface Api {
  app: Express;
  poller: Poller;
}

function feedSourceFor(config: Config, deps: Deps): FeedSource {
  if (config.feed.source === 'at') {
    return new AtFeedSource({ apiKey: config.feed.apiKey, fetch: deps.fetch });
  }
  return new FixtureFeedSource({ path: FIXTURE_FEED_PATH, readText: deps.readText, now: deps.now });
}

function assistantFor(config: Config, deps: Deps, store: Store): Assistant | null {
  if (config.assistant === null) return null;
  const { apiKey, model, questionsPerHour } = config.assistant;
  return createAssistant({
    client: createAnthropicClient({ apiKey, fetch: deps.fetch }),
    model,
    tools: BOARD_TOOLS,
    store,
    feedSource: config.feed.source,
    limiter: createHourlyLimiter({ perHour: questionsPerHour, now: deps.now }),
    log: deps.log,
  });
}

export async function composeApi(config: Config, deps: Deps): Promise<Api> {
  const gtfs = await loadGtfs(config.gtfsDir, deps.readText);
  const store = createMemoryStore({
    pollIntervalSeconds: config.pollIntervalSeconds,
    now: deps.now,
  });
  const poller = createPoller({
    source: feedSourceFor(config, deps),
    gtfs,
    store,
    intervalSeconds: config.pollIntervalSeconds,
    maxUpdateAgeSeconds: config.maxUpdateAgeSeconds,
    now: deps.now,
    schedule: deps.schedule,
    log: deps.log,
  });
  const app = createApp({
    store,
    feedSource: config.feed.source,
    assistant: assistantFor(config, deps, store),
  });
  return { app, poller };
}
