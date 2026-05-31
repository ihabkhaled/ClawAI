import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { LoadingState } from '@/components/common/loading-state';
import { LoadingStateVariant } from '@/enums/loading-state.enum';

describe('LoadingState', () => {
  it('renders a busy status region', () => {
    render(<LoadingState label="Loading models" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-label', 'Loading models');
  });

  it('renders the requested number of list rows', () => {
    const { container } = render(
      <LoadingState variant={LoadingStateVariant.List} rows={5} />,
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5);
  });

  it('clamps rows to at least one', () => {
    const { container } = render(
      <LoadingState variant={LoadingStateVariant.Card} rows={0} />,
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
