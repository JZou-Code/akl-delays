import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../api/index.ts';
import { LoadNotice } from './LoadNotice.tsx';

describe('LoadNotice', () => {
  it('says it is loading', () => {
    render(<LoadNotice loading error={undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading.');
  });

  it('treats the 503 before the first poll as waiting, not as an error', () => {
    render(<LoadNotice loading={false} error={new ApiRequestError(503, 'no feed data yet')} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Waiting for the first data from the feed.',
    );
  });

  it('says what went wrong', () => {
    render(
      <LoadNotice loading={false} error={new ApiRequestError(502, 'the API answered HTTP 502')} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Could not load the data: the API answered HTTP 502.',
    );
  });

  it('shows nothing when there is nothing to say', () => {
    const { container } = render(<LoadNotice loading={false} error={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});
