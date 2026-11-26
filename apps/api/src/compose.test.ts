import type { DelaysPage } from '@akl-delays/shared';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { composeApi, type Deps } from './compose.ts';
import { loadConfig } from './config/index.ts';
import { FIXTURE_FEED_PATH, type Fetch } from './feed/index.ts';

const NOW = new Date('2026-11-20T08:30:00.000Z');

function deps(fetch: Fetch = vi.fn<Fetch>()): Deps {
  return {
    readText: (path) => readFile(path, 'utf8'),
    fetch,
    now: () => NOW,
    schedule: () => () => undefined,
    log: () => undefined,
  };
}

const zero = { early: 0, on_time: 0, late: 0, very_late: 0, cancelled: 0, unknown: 0, total: 0 };

describe('composeApi on the fixture files', () => {
  it('answers 503 until the first poll', async () => {
    const { app } = await composeApi(loadConfig({}), deps());

    expect((await request(app).get('/api/summary')).status).toBe(503);
  });

  it('serves a current summary of the fixture feed after the first poll', async () => {
    const { app, poller } = await composeApi(loadConfig({}), deps());
    await poller.start();

    const response = await request(app).get('/api/summary');

    expect(response.body).toEqual({
      feedTimestamp: NOW.toISOString(),
      fetchedAt: NOW.toISOString(),
      stale: false,
      modes: {
        bus: { early: 3, on_time: 4, late: 3, very_late: 1, cancelled: 2, unknown: 0, total: 13 },
        train: { ...zero, early: 1, on_time: 3, total: 4 },
        ferry: { ...zero, on_time: 1, late: 1, total: 2 },
      },
    });
  });

  it('lists the worst delays first, with route and stop names from the GTFS files', async () => {
    const { app, poller } = await composeApi(loadConfig({}), deps());
    await poller.start();

    const response = await request(app).get('/api/delays?limit=2');
    const [first, second] = (response.body as DelaysPage).services;

    expect(first).toMatchObject({
      routeName: '373',
      mode: 'bus',
      delaySeconds: 2756,
      status: 'very_late',
      stopName: 'Smiths Avenue',
    });
    expect(second).toMatchObject({ routeName: '83', mode: 'bus', status: 'late' });
  });

  it('lists a service whose route is not in the GTFS files without a name or mode', async () => {
    const { app, poller } = await composeApi(loadConfig({}), deps());
    await poller.start();

    const response = await request(app).get('/api/routes/S094-217');

    expect(response.body).toMatchObject({ routeId: 'S094-217', routeName: null, mode: null });
  });
});

describe('composeApi with FEED_SOURCE=at', () => {
  it('reads the feed through fetch', async () => {
    const body = await readFile(FIXTURE_FEED_PATH, 'utf8');
    const fetch = vi.fn<Fetch>(() => Promise.resolve(new Response(body)));
    const config = loadConfig({ FEED_SOURCE: 'at', AT_API_KEY: 'test-key' });
    const { app, poller } = await composeApi(config, deps(fetch));

    await poller.start();
    const health = await request(app).get('/api/health');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(health.body).toMatchObject({ feedSource: 'at' });
    expect((await request(app).get('/api/delays')).body).toMatchObject({ total: 20 });
  });
});

describe('composeApi with ANTHROPIC_API_KEY', () => {
  const message = {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content: [{ type: 'text', text: 'Two buses are cancelled.' }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 900, output_tokens: 40 },
  };

  function setup(env: Record<string, string>) {
    const fetch = vi.fn<Fetch>(() => Promise.resolve(Response.json(message)));
    return { fetch, composed: composeApi(loadConfig(env), deps(fetch)) };
  }

  it('leaves the assistant off without a key', async () => {
    const { composed } = setup({});
    const { app, poller } = await composed;
    await poller.start();

    expect((await request(app).get('/api/health')).body).toMatchObject({ assistant: false });
    expect((await request(app).post('/api/ask').send({ question: 'Anything?' })).status).toBe(503);
  });

  it('answers a question through the model with the default model name', async () => {
    const { fetch, composed } = setup({ ANTHROPIC_API_KEY: 'test-anthropic-key' });
    const { app, poller } = await composed;
    await poller.start();

    const health = await request(app).get('/api/health');
    const response = await request(app)
      .post('/api/ask')
      .send({ question: 'Is anything cancelled?' });

    expect(health.body).toMatchObject({ assistant: true });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      answer: 'Two buses are cancelled.',
      steps: [],
      model: 'claude-haiku-5-5',
      usage: { inputTokens: 900, outputTokens: 40 },
      feedTimestamp: NOW.toISOString(),
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.anthropic.com/v1/messages');
  });

  it('answers 429 after the hourly limit', async () => {
    const { composed } = setup({
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      ASSISTANT_QUESTIONS_PER_HOUR: '1',
    });
    const { app, poller } = await composed;
    await poller.start();

    const first = await request(app).post('/api/ask').send({ question: 'Anything?' });
    const second = await request(app).post('/api/ask').send({ question: 'Anything?' });

    expect([first.status, second.status]).toEqual([200, 429]);
  });
});
