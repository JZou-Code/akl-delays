import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../api/index.ts';
import { formatClock } from './format.ts';
import { StatusBanner } from './StatusBanner.tsx';

const FETCHED = '2026-11-19T19:00:05.000Z';
const clock = formatClock(FETCHED);

describe('StatusBanner', () => {
  it('shows nothing when the data is fresh and the last request worked', () => {
    const { container } = render(
      <StatusBanner stale={false} failure={undefined} fetchedAt={FETCHED} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('says the data is out of date when the feed is stale', () => {
    render(<StatusBanner stale failure={undefined} fetchedAt={FETCHED} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      `The data is out of date. The API last got the feed at ${clock}.`,
    );
  });

  it('says the data is out of date without a time when it has none', () => {
    render(<StatusBanner stale failure={undefined} fetchedAt={undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent(/^The data is out of date\.$/);
  });

  it('says the last update failed and which data is shown', () => {
    const failure = new ApiRequestError(502, 'the API answered HTTP 502');

    render(<StatusBanner stale={false} failure={failure} fetchedAt={FETCHED} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      `The last update failed (the API answered HTTP 502). This is the data from ${clock}. The page keeps trying.`,
    );
  });

  it('says the API could not be reached when the request itself failed', () => {
    render(
      <StatusBanner stale={false} failure={new TypeError('Failed to fetch')} fetchedAt={FETCHED} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'The last update failed (could not reach the API).',
    );
  });

  it('treats a 503 after earlier data as waiting, not as a failure', () => {
    const failure = new ApiRequestError(503, 'no feed data yet');

    render(<StatusBanner stale={false} failure={failure} fetchedAt={FETCHED} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      `The API is waiting for the first data from the feed. This is the data from ${clock}.`,
    );
  });

  it('does without the time when there is no summary', () => {
    render(<StatusBanner stale={false} failure={new Error('down')} fetchedAt={undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'This is the last data the page got. The page keeps trying.',
    );
  });

  it('says both when the feed is stale and the last request failed', () => {
    render(<StatusBanner stale failure={new Error('down')} fetchedAt={FETCHED} />);

    expect(screen.getByText(/^The last update failed/)).toBeInTheDocument();
    expect(screen.getByText(/^The data is out of date/)).toBeInTheDocument();
  });
});
