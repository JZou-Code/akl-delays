import type { AskResponse } from '@akl-delays/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AskAnswer } from './AskAnswer.tsx';

const response: AskResponse = {
  answer: 'Two buses are cancelled.',
  steps: [
    { tool: 'get_summary', input: {}, summary: '19 services' },
    {
      tool: 'list_delays',
      input: { mode: 'bus', status: 'cancelled', limit: 5 },
      summary: '2 services',
    },
  ],
  model: 'claude-haiku-5-5',
  usage: { inputTokens: 2130, outputTokens: 164 },
  feedSource: 'fixture',
  feedTimestamp: '2026-11-24T01:54:00.000Z',
};

describe('AskAnswer', () => {
  it('shows the answer', () => {
    render(<AskAnswer response={response} />);

    expect(screen.getByText('Two buses are cancelled.')).toBeInTheDocument();
  });

  it('lists each tool call in plain words with what came back', () => {
    render(<AskAnswer response={response} />);

    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual([
      'Counted the services on the board. Found 19 services.',
      'Looked at cancelled buses. Found 2 services.',
    ]);
  });

  it('leaves the list out when the model called no tool', () => {
    render(<AskAnswer response={{ ...response, steps: [] }} />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('names the model, says it can be wrong and gives the token counts', () => {
    render(<AskAnswer response={response} />);

    const source = screen.getByText(/Written by the AI model/);
    expect(source).toHaveTextContent('claude-haiku-5-5');
    expect(source).toHaveTextContent('It can be wrong.');
    expect(source).toHaveTextContent('2,130 tokens in, 164 out.');
  });

  it('says that fixture data is a recording and gives no feed time', () => {
    render(<AskAnswer response={response} />);

    const source = screen.getByText(/Written by the AI model/);
    expect(source).toHaveTextContent('from recorded sample data, not the live feed.');
    expect(source).not.toHaveTextContent(/\d{1,2}:\d{2}/);
  });

  it('gives the feed time for live data', () => {
    render(<AskAnswer response={{ ...response, feedSource: 'at' }} />);

    expect(screen.getByText(/Written by the AI model/)).toHaveTextContent(
      /from the live feed at \d{1,2}:54:00/,
    );
  });
});
