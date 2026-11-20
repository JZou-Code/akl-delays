import { fileURLToPath } from 'node:url';
import { parseFeed, type Feed } from './schema.ts';
import type { FeedSource, ReadText } from './source.ts';

export const FIXTURE_FEED_PATH = fileURLToPath(
  new URL('../../fixtures/tripupdates.json', import.meta.url),
);

export interface FixtureFeedSourceOptions {
  path: string;
  readText: ReadText;
  now: () => Date;
}

function shiftEvent<T extends { time?: number | undefined }>(
  event: T | undefined,
  seconds: number,
) {
  return event?.time === undefined ? event : { ...event, time: event.time + seconds };
}

function shiftTimes(feed: Feed, seconds: number): Feed {
  return {
    header: { ...feed.header, timestamp: feed.header.timestamp + seconds },
    entity: feed.entity.map(({ trip_update: update, ...entity }) =>
      update === undefined
        ? entity
        : {
            ...entity,
            trip_update: {
              ...update,
              timestamp: update.timestamp === undefined ? undefined : update.timestamp + seconds,
              stop_time_update: update.stop_time_update.map((stop) => ({
                ...stop,
                arrival: shiftEvent(stop.arrival, seconds),
                departure: shiftEvent(stop.departure, seconds),
              })),
            },
          },
    ),
  };
}

export class FixtureFeedSource implements FeedSource {
  readonly #options: FixtureFeedSourceOptions;

  constructor(options: FixtureFeedSourceOptions) {
    this.#options = options;
  }

  async fetchFeed(): Promise<Feed> {
    const { path, readText, now } = this.#options;
    const feed = parseFeed(JSON.parse(await readText(path)));
    const nowSeconds = Math.floor(now().getTime() / 1000);
    return shiftTimes(feed, nowSeconds - feed.header.timestamp);
  }
}
