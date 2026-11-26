import type { AskResponse, Health } from '@akl-delays/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FetchProvider, type Fetch } from '../../api/index.ts';
import { AskSection } from './AskSection.tsx';

const answer: AskResponse = {
  answer: 'Two buses are cancelled.',
  steps: [{ tool: 'list_delays', input: { status: 'cancelled' }, summary: '2 services' }],
  model: 'claude-haiku-5-5',
  usage: { inputTokens: 900, outputTokens: 40 },
  feedTimestamp: '2026-11-24T01:54:00.000Z',
};

function health(assistant: boolean): Health {
  return { ok: true, feedSource: 'fixture', lastFetchedAt: null, assistant };
}

type Reply = Response | Promise<Response>;

function setup(assistant: boolean, onAsk: () => Reply = () => Response.json(answer)) {
  const fetch = vi.fn<Fetch>((input) =>
    Promise.resolve(input === '/api/health' ? Response.json(health(assistant)) : onAsk()),
  );
  render(
    <FetchProvider fetch={fetch}>
      <AskSection />
    </FetchProvider>,
  );
  const asked = () => fetch.mock.calls.filter(([input]) => input === '/api/ask');
  return { fetch, asked };
}

async function askQuestion(text: string): Promise<void> {
  fireEvent.change(await screen.findByRole('textbox', { name: 'Question' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
}

describe('AskSection', () => {
  it('shows the box when the API can answer questions', async () => {
    setup(true);

    expect(await screen.findByRole('heading', { name: 'Ask about the board' })).toBeInTheDocument();
  });

  it('shows nothing when the API has no key', async () => {
    const { fetch } = setup(false);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows nothing when the API cannot be reached', async () => {
    const fetch = vi.fn<Fetch>(() => Promise.reject(new TypeError('fetch failed')));
    render(
      <FetchProvider fetch={fetch}>
        <AskSection />
      </FetchProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('sends the question and shows the answer with its steps', async () => {
    const { asked } = setup(true);

    await askQuestion('Is anything cancelled?');

    expect(await screen.findByText('Two buses are cancelled.')).toBeInTheDocument();
    expect(screen.getByText('list_delays').closest('li')).toHaveTextContent(
      'list_delays (status: "cancelled"): 2 services',
    );
    expect(asked()[0]?.[1]?.body).toBe('{"question":"Is anything cancelled?"}');
  });

  it('says it is asking until the answer comes', async () => {
    let finish: (response: Response) => void = () => undefined;
    setup(true, () => new Promise<Response>((resolve) => (finish = resolve)));

    await askQuestion('Is anything cancelled?');

    expect(await screen.findByRole('status')).toHaveTextContent('Asking.');
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();

    finish(Response.json(answer));

    expect(await screen.findByText('Two buses are cancelled.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the reason when the API refuses', async () => {
    setup(true, () =>
      Response.json(
        { error: 'the hourly question limit is reached, try again later' },
        { status: 429 },
      ),
    );

    await askQuestion('Is anything cancelled?');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not get an answer (the hourly question limit is reached, try again later).',
    );
  });

  it('replaces the last answer with the next one', async () => {
    const replies = [answer, { ...answer, answer: 'The trains are on time.', steps: [] }];
    setup(true, () => Response.json(replies.shift()));

    await askQuestion('Is anything cancelled?');
    await screen.findByText('Two buses are cancelled.');
    await askQuestion('Are the trains on time?');

    expect(await screen.findByText('The trains are on time.')).toBeInTheDocument();
    expect(screen.queryByText('Two buses are cancelled.')).not.toBeInTheDocument();
  });
});
