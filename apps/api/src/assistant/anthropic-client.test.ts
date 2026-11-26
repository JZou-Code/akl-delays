import { describe, expect, it, vi } from 'vitest';
import { createAnthropicClient, MODEL_RETRIES } from './anthropic-client.ts';
import type { ModelRequest } from './loop.ts';

const API_KEY = 'test-anthropic-key';

const request: ModelRequest = {
  model: 'claude-test',
  max_tokens: 100,
  output_config: { effort: 'low' },
  messages: [{ role: 'user', content: 'Is anything cancelled?' }],
};

const message = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-test',
  content: [{ type: 'text', text: 'Nothing is cancelled.' }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 12, output_tokens: 5 },
};

function answering(status: number, body: unknown) {
  return vi.fn<typeof globalThis.fetch>(() =>
    Promise.resolve(Response.json(body, { status, headers: { 'x-should-retry': 'false' } })),
  );
}

describe('createAnthropicClient', () => {
  it('posts the request to the Messages API with the key in the authorization header', async () => {
    const fetch = answering(200, message);

    await createAnthropicClient({ apiKey: API_KEY, fetch }).create(request);

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${API_KEY}`);
    expect(typeof init?.body === 'string' ? JSON.parse(init.body) : undefined).toEqual(request);
  });

  it('returns the content, the stop reason and the usage', async () => {
    const client = createAnthropicClient({ apiKey: API_KEY, fetch: answering(200, message) });

    expect(await client.create(request)).toMatchObject({
      content: [{ type: 'text', text: 'Nothing is cancelled.' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 12, output_tokens: 5 },
    });
  });

  it('fails on an HTTP error without the key in the message', async () => {
    const body = {
      type: 'error',
      error: { type: 'authentication_error', message: 'invalid x-api-key' },
    };
    const client = createAnthropicClient({ apiKey: API_KEY, fetch: answering(401, body) });

    const error = await client.create(request).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain(API_KEY);
  });

  it('retries a failed call once', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(Response.json({ type: 'error' }, { status: 500 })),
    );
    const client = createAnthropicClient({ apiKey: API_KEY, fetch });

    await expect(client.create(request)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1 + MODEL_RETRIES);
  });
});
