import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge.tsx';

describe('StatusBadge', () => {
  it('shows the status as text and marks it for its colour', () => {
    render(<StatusBadge status="very_late" />);

    expect(screen.getByText('Very late')).toHaveAttribute('data-status', 'very_late');
  });
});
