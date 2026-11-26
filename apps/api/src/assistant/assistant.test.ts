import { describe, expect, it } from 'vitest';
import type { Snapshot, Store } from '../store/index.ts';
import { AskError, createAssistant } from './assistant.ts';
import type { Limiter } from './limiter.ts';
import type { ModelClient, ModelReply, ModelRequest } from './loop.ts';
import { BOARD_TOOLS } from './tools.ts';

const snapshot: Snapshot = {
  feedTimestamp: '2026-11-24T01:54:00.000Z',
  fetchedAt: '2026-11-24T01:54:05.000Z',
  services: [],
};

const answer: ModelReply = {
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: 'Nothing is running.', citations: null }],
  usage: { input_tokens: 900, output_tokens: 40 },
};

function setup(options: { snapshot?: Snapshot | null; stale?: boolean; room?: boolean } = {}) {
  const { stale = false, room = true } = options;
  const held = options.snapshot === undefined ? snapshot : options.snapshot;
  const store: Store = { get: () => held, set: () => undefined, isStale: () => stale };
  const requests: ModelRequest[] = [];
  let reply: Promise<ModelReply> = Promise.resolve(answer);
  const client: ModelClient = {
    create: (request) => {
      requests.push(request);
      return reply;
    },
  };
  let taken = 0;
  const limiter: Limiter = {
    take: () => {
      if (room) taken += 1;
      return room;
    },
  };
  const lines: string[] = [];
  const assistant = createAssistant({
    client,
    model: 'claude-test',
    tools: BOARD_TOOLS,
    store,
    feedSource: 'at',
    limiter,
    log: (line) => lines.push(line),
  });
  return {
    assistant,
    requests,
    lines,
    taken: () => taken,
    failWith: (error: Error) => {
      reply = Promise.reject(error);
    },
  };
}

function failureOf(asking: Promise<unknown>): Promise<unknown> {
  return asking.then(
    () => 'no failure',
    (error: unknown) => (error instanceof AskError ? error.failure : error),
  );
}

describe('createAssistant', () => {
  it('answers with the model name and the feed time of the snapshot it read', async () => {
    const { assistant } = setup();

    expect(await assistant.ask('What is running?')).toEqual({
      answer: 'Nothing is running.',
      steps: [],
      model: 'claude-test',
      usage: { inputTokens: 900, outputTokens: 40 },
      feedTimestamp: '2026-11-24T01:54:00.000Z',
    });
  });

  it('tells the model where the data is from and whether it is stale', async () => {
    const { assistant, requests } = setup({ stale: true });

    await assistant.ask('What is running?');

    const content = requests[0]?.messages[0]?.content;
    expect(content).toContain("Auckland Transport's live feed");
    expect(content).toContain('The data is stale');
  });

  it('fails with no_data before the first poll, without counting the question', async () => {
    const { assistant, requests, taken } = setup({ snapshot: null });

    expect(await failureOf(assistant.ask('What is running?'))).toBe('no_data');
    expect(requests).toHaveLength(0);
    expect(taken()).toBe(0);
  });

  it('fails with limit and does not call the model when the hour is used up', async () => {
    const { assistant, requests } = setup({ room: false });

    expect(await failureOf(assistant.ask('What is running?'))).toBe('limit');
    expect(requests).toHaveLength(0);
  });

  it('fails with failed and logs the reason on one line when the model call fails', async () => {
    const { assistant, lines, failWith } = setup();
    failWith(new Error('503\n overloaded'));

    expect(await failureOf(assistant.ask('What is running?'))).toBe('failed');
    expect(lines).toEqual(['ask failed: 503 overloaded']);
  });

  it('logs the size of an answer and not the question', async () => {
    const { assistant, lines } = setup();

    await assistant.ask('What is running?');

    expect(lines).toEqual(['ask ok: 0 tool calls, 900 tokens in, 40 out']);
  });
});
