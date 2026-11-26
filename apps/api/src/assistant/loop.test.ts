import type Anthropic from '@anthropic-ai/sdk';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadFixtureBoard } from './fixture-board.ts';
import {
  AssistantError,
  CANNOT_ANSWER,
  MAX_MODEL_CALLS,
  runAsk,
  type ModelClient,
  type ModelReply,
  type ModelRequest,
} from './loop.ts';
import { SYSTEM_PROMPT } from './prompt.ts';
import { BOARD_TOOLS, type BoardView } from './tools.ts';

const NOW = new Date('2026-11-20T08:30:00.000Z');
const MODEL = 'claude-test';

let board: BoardView;

beforeAll(async () => {
  board = await loadFixtureBoard(NOW);
});

function text(value: string): Anthropic.TextBlock {
  return { type: 'text', text: value, citations: null };
}

function thinking(): Anthropic.ThinkingBlock {
  return { type: 'thinking', thinking: '', signature: 'sig-1' };
}

function toolUse(id: string, name: string, input: unknown): Anthropic.ToolUseBlock {
  return { type: 'tool_use', id, name, input, caller: { type: 'direct' } };
}

function reply(
  stop: ModelReply['stop_reason'],
  content: Anthropic.ContentBlock[],
  tokens: [number, number] = [100, 10],
): ModelReply {
  return {
    stop_reason: stop,
    content,
    usage: { input_tokens: tokens[0], output_tokens: tokens[1] },
  };
}

// Answers with the scripted replies in order and keeps a copy of each request.
function scripted(...replies: ModelReply[]) {
  const requests: ModelRequest[] = [];
  const client: ModelClient = {
    create: (request) => {
      requests.push(structuredClone(request));
      const next = replies[requests.length - 1];
      return next === undefined
        ? Promise.reject(new Error('the script has no more replies'))
        : Promise.resolve(next);
    },
  };
  return { client, requests };
}

function ask(client: ModelClient, question = 'Is anything cancelled?') {
  return runAsk(question, { client, model: MODEL, tools: BOARD_TOOLS, board });
}

function toolResults(request: ModelRequest | undefined): Anthropic.ToolResultBlockParam[] {
  const last = request?.messages.at(-1);
  if (last === undefined || typeof last.content === 'string') return [];
  return last.content.flatMap((block) => (block.type === 'tool_result' ? [block] : []));
}

describe('runAsk', () => {
  it('returns the text of an answer that needed no tool', async () => {
    const { client } = scripted(reply('end_turn', [thinking(), text('Nothing is cancelled.')]));

    expect(await ask(client)).toEqual({
      answer: 'Nothing is cancelled.',
      steps: [],
      usage: { inputTokens: 100, outputTokens: 10 },
    });
  });

  it('sends the fixed prompt, the tools, low effort and the question', async () => {
    const { client, requests } = scripted(reply('end_turn', [text('Yes.')]));

    await ask(client, 'Are the trains on time?');

    expect(requests[0]).toMatchObject({
      model: MODEL,
      system: SYSTEM_PROMPT,
      output_config: { effort: 'low' },
      tools: BOARD_TOOLS.map((tool) => tool.definition),
    });
    expect(requests[0]?.messages).toHaveLength(1);
    expect(requests[0]?.messages[0]?.content).toMatch(/^Are the trains on time\?\n\nData source/);
  });

  it('runs a tool call and answers from its result', async () => {
    const call = toolUse('call-1', 'list_delays', { mode: 'bus', status: 'cancelled' });
    const { client, requests } = scripted(
      reply('tool_use', [thinking(), call], [200, 20]),
      reply('end_turn', [text('Two buses are cancelled.')], [300, 30]),
    );

    const outcome = await ask(client);

    expect(outcome).toEqual({
      answer: 'Two buses are cancelled.',
      steps: [
        {
          tool: 'list_delays',
          input: { mode: 'bus', status: 'cancelled' },
          summary: '2 services',
        },
      ],
      usage: { inputTokens: 500, outputTokens: 50 },
    });
    const [result] = toolResults(requests[1]);
    expect(result).toMatchObject({ type: 'tool_result', tool_use_id: 'call-1' });
    expect(result?.is_error).toBeUndefined();
    expect(typeof result?.content).toBe('string');
    expect(result?.content).toContain('"total":2');
  });

  it('sends the whole reply back, thinking block included', async () => {
    const first = [thinking(), toolUse('call-1', 'get_summary', {})];
    const { client, requests } = scripted(
      reply('tool_use', first),
      reply('end_turn', [text('Done.')]),
    );

    await ask(client);

    expect(requests[1]?.messages[1]).toEqual({ role: 'assistant', content: first });
  });

  it('returns the results of two calls in one message', async () => {
    const { client, requests } = scripted(
      reply('tool_use', [
        toolUse('call-1', 'get_summary', {}),
        toolUse('call-2', 'get_route', { route: '373' }),
      ]),
      reply('end_turn', [text('Done.')]),
    );

    const outcome = await ask(client);

    expect(requests[1]?.messages).toHaveLength(3);
    expect(toolResults(requests[1]).map((result) => result.tool_use_id)).toEqual([
      'call-1',
      'call-2',
    ]);
    expect(outcome.steps.map((step) => step.tool)).toEqual(['get_summary', 'get_route']);
  });

  it('tells the model about a tool that does not exist and carries on', async () => {
    const { client, requests } = scripted(
      reply('tool_use', [toolUse('call-1', 'delete_route', { route: '70' })]),
      reply('end_turn', [text('I cannot do that.')]),
    );

    const outcome = await ask(client);

    expect(toolResults(requests[1])).toEqual([
      {
        type: 'tool_result',
        tool_use_id: 'call-1',
        is_error: true,
        content: 'no tool has this name',
      },
    ]);
    expect(outcome.steps).toEqual([
      { tool: 'delete_route', input: { route: '70' }, summary: 'refused: no tool has this name' },
    ]);
    expect(outcome.answer).toBe('I cannot do that.');
  });

  it('tells the model about input that fails the schema', async () => {
    const { client, requests } = scripted(
      reply('tool_use', [toolUse('call-1', 'list_delays', { limit: 500 })]),
      reply('end_turn', [text('Done.')]),
    );

    const outcome = await ask(client);

    expect(toolResults(requests[1])[0]).toMatchObject({ tool_use_id: 'call-1', is_error: true });
    expect(outcome.steps[0]?.summary).toMatch(/^refused: /);
  });

  it('records an empty input when the model sends something that is not an object', async () => {
    const { client } = scripted(
      reply('tool_use', [toolUse('call-1', 'get_summary', 'everything')]),
      reply('end_turn', [text('Done.')]),
    );

    expect((await ask(client)).steps[0]).toMatchObject({ tool: 'get_summary', input: {} });
  });

  it('gives up after the limit of model calls', async () => {
    const again = reply('tool_use', [toolUse('call-1', 'get_summary', {})]);
    const { client, requests } = scripted(...Array.from({ length: 10 }, () => again));

    await expect(ask(client)).rejects.toThrow(
      new AssistantError(`the model did not finish within ${MAX_MODEL_CALLS} calls`),
    );
    expect(requests).toHaveLength(MAX_MODEL_CALLS);
  });

  it.each(['refusal', 'max_tokens'] as const)(
    'answers with a fixed sentence on %s',
    async (stop) => {
      const { client } = scripted(reply(stop, [text('Partial text that must not be shown')]));

      expect((await ask(client)).answer).toBe(CANNOT_ANSWER);
    },
  );

  it('answers with the fixed sentence when the model writes no text', async () => {
    const { client } = scripted(reply('end_turn', [thinking()]));

    expect((await ask(client)).answer).toBe(CANNOT_ANSWER);
  });

  it('passes on a failed model call', async () => {
    const client: ModelClient = { create: () => Promise.reject(new Error('overloaded')) };

    await expect(ask(client)).rejects.toThrow('overloaded');
  });
});
