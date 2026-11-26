import Anthropic from '@anthropic-ai/sdk';
import type { ModelClient } from './loop.ts';

// The SDK's defaults are 10 minutes and two retries, which would leave the page waiting.
export const MODEL_TIMEOUT_MS = 30_000;
export const MODEL_RETRIES = 1;

export interface AnthropicClientOptions {
  apiKey: string;
  fetch: typeof globalThis.fetch;
}

export function createAnthropicClient({ apiKey, fetch }: AnthropicClientOptions): ModelClient {
  const client = new Anthropic({
    apiKey,
    fetch,
    timeout: MODEL_TIMEOUT_MS,
    maxRetries: MODEL_RETRIES,
  });
  return { create: (request) => client.messages.create(request) };
}
