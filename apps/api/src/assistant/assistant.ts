import type { AskResponse, FeedSourceName } from '@akl-delays/shared';
import type { Store } from '../store/index.ts';
import type { Limiter } from './limiter.ts';
import { runAsk, type ModelClient } from './loop.ts';
import type { AssistantTool } from './tools.ts';

export type AskFailure = 'no_data' | 'limit' | 'failed';

export class AskError extends Error {
  override name = 'AskError';
  readonly failure: AskFailure;

  constructor(failure: AskFailure, message: string) {
    super(message);
    this.failure = failure;
  }
}

export interface Assistant {
  ask: (question: string) => Promise<AskResponse>;
}

export interface AssistantOptions {
  client: ModelClient;
  model: string;
  tools: readonly AssistantTool[];
  store: Store;
  feedSource: FeedSourceName;
  limiter: Limiter;
  log: (line: string) => void;
}

function oneLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').trim();
}

export function createAssistant(options: AssistantOptions): Assistant {
  const { client, model, tools, store, feedSource, limiter, log } = options;
  return {
    ask: async (question) => {
      const snapshot = store.get();
      if (snapshot === null) throw new AskError('no_data', 'no feed data yet');
      // The limit is checked last, so only a question that reaches the model counts.
      if (!limiter.take()) {
        throw new AskError('limit', 'the hourly question limit is reached, try again later');
      }
      const board = { snapshot, stale: store.isStale(), feedSource };
      try {
        const { answer, steps, usage } = await runAsk(question, { client, model, tools, board });
        log(
          `ask ok: ${steps.length} tool calls, ${usage.inputTokens} tokens in, ${usage.outputTokens} out`,
        );
        return { answer, steps, model, usage, feedTimestamp: snapshot.feedTimestamp };
      } catch (error) {
        log(`ask failed: ${oneLine(error)}`);
        throw new AskError('failed', 'the model could not answer');
      }
    },
  };
}
