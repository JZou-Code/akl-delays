import type { Express } from 'express';
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
import { createMemoryStore } from './store/index.ts';

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
  const app = createApp({ store, feedSource: config.feed.source });
  return { app, poller };
}
