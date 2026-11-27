import type { Express } from 'express';
import {
  BOARD_TOOLS,
  departuresTool,
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
import { createStopBoard, type StopBoard } from './departures/index.ts';
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

function assistantFor(
  config: Config,
  deps: Deps,
  store: Store,
  stops: StopBoard | null,
): Assistant | null {
  if (config.assistant === null) return null;
  const { apiKey, model, questionsPerHour } = config.assistant;
  return createAssistant({
    client: createAnthropicClient({ apiKey, fetch: deps.fetch }),
    model,
    tools:
      stops === null ? BOARD_TOOLS : [...BOARD_TOOLS, departuresTool({ stops, now: deps.now })],
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
  const stops = createStopBoard({
    gtfs,
    now: deps.now,
    includeScheduled: config.feed.source === 'at',
  });
  const app = createApp({
    store,
    stops,
    feedSource: config.feed.source,
    assistant: assistantFor(config, deps, store, stops),
  });
  return { app, poller };
}
