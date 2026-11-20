import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatClock } from '../../components/index.ts';
import { FeedTime } from './FeedTime.tsx';

const FEED = '2026-11-19T19:00:00.000Z';
const FETCHED = '2026-11-19T19:00:05.000Z';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-19T19:00:17.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FeedTime', () => {
  it('gives the feed time in local time and how long ago the API fetched it', () => {
    render(<FeedTime feedTimestamp={FEED} fetchedAt={FETCHED} />);

    expect(screen.getByText(/^Feed time/)).toHaveTextContent(
      `Feed time ${formatClock(FEED)}, updated 12 seconds ago.`,
    );
  });

  it('marks both times with their ISO value', () => {
    render(<FeedTime feedTimestamp={FEED} fetchedAt={FETCHED} />);

    expect(screen.getByText(formatClock(FEED))).toHaveAttribute('datetime', FEED);
    expect(screen.getByText('12 seconds ago')).toHaveAttribute('datetime', FETCHED);
  });

  it('counts up as time passes', () => {
    render(<FeedTime feedTimestamp={FEED} fetchedAt={FETCHED} />);

    act(() => {
      vi.advanceTimersByTime(50_000);
    });

    expect(screen.getByText('1 min ago')).toBeInTheDocument();
  });
});
