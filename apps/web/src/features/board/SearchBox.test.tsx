import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEARCH_DELAY_MS, SearchBox } from './SearchBox.tsx';

function type(text: string): void {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Route or stop' }), {
    target: { value: text },
  });
}

function wait(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SearchBox', () => {
  it('shows the text it is given', () => {
    render(<SearchBox value="newmarket" onChange={vi.fn()} />);

    expect(screen.getByRole('searchbox', { name: 'Route or stop' })).toHaveValue('newmarket');
  });

  it('reports the text once typing has stopped', () => {
    const onChange = vi.fn<(text: string) => void>();
    render(<SearchBox value="" onChange={onChange} />);

    type('7');
    wait(SEARCH_DELAY_MS - 1);
    expect(onChange).not.toHaveBeenCalled();

    wait(1);
    expect(onChange.mock.calls).toEqual([['7']]);
  });

  it('reports only the last text of a burst of typing', () => {
    const onChange = vi.fn<(text: string) => void>();
    render(<SearchBox value="" onChange={onChange} />);

    type('7');
    wait(100);
    type('70');
    wait(SEARCH_DELAY_MS);

    expect(onChange.mock.calls).toEqual([['70']]);
  });

  it('reports an emptied box', () => {
    const onChange = vi.fn<(text: string) => void>();
    render(<SearchBox value="70" onChange={onChange} />);

    type('');
    wait(SEARCH_DELAY_MS);

    expect(onChange.mock.calls).toEqual([['']]);
  });

  it('reports nothing when the text is back to what it was given', () => {
    const onChange = vi.fn<(text: string) => void>();
    render(<SearchBox value="70" onChange={onChange} />);

    type('701');
    wait(100);
    type('70');
    wait(SEARCH_DELAY_MS);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the text as typed before it is reported', () => {
    render(<SearchBox value="" onChange={vi.fn()} />);

    type('pan');

    expect(screen.getByRole('searchbox', { name: 'Route or stop' })).toHaveValue('pan');
  });
});
