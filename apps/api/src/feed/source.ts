import type { Feed } from './schema.ts';

export interface FeedSource {
  fetchFeed(): Promise<Feed>;
}

export type ReadText = (path: string) => Promise<string>;
