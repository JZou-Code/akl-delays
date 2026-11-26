import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AskForm, EXAMPLE_QUESTIONS } from './AskForm.tsx';

function setup(asking = false) {
  const onAsk = vi.fn<(question: string) => void>();
  render(<AskForm asking={asking} onAsk={onAsk} />);
  const box = screen.getByRole('textbox', { name: 'Question' });
  const button = screen.getByRole('button', { name: 'Ask' });
  return { onAsk, box, button };
}

describe('AskForm', () => {
  it('cannot be sent while the box is empty', () => {
    const { button } = setup();

    expect(button).toBeDisabled();
  });

  it('sends the trimmed question', () => {
    const { onAsk, box, button } = setup();

    fireEvent.change(box, { target: { value: '  Are the trains on time? ' } });
    fireEvent.click(button);

    expect(onAsk.mock.calls).toEqual([['Are the trains on time?']]);
  });

  it('does not send a question of spaces', () => {
    const { onAsk, box, button } = setup();

    fireEvent.change(box, { target: { value: '   ' } });

    expect(button).toBeDisabled();
    expect(onAsk).not.toHaveBeenCalled();
  });

  it('stops typing at 300 characters', () => {
    expect(setup().box).toHaveAttribute('maxlength', '300');
  });

  it('puts an example in the box and sends it', () => {
    const { onAsk, box } = setup();

    fireEvent.click(screen.getByRole('button', { name: EXAMPLE_QUESTIONS[2] }));

    expect(box).toHaveValue(EXAMPLE_QUESTIONS[2]);
    expect(onAsk.mock.calls).toEqual([[EXAMPLE_QUESTIONS[2]]]);
  });

  it('turns every button off while a question is out', () => {
    setup(true);

    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});
