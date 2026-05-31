import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { ErrorState } from '@/components/common/error-state';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ErrorState', () => {
  it('renders an explicit title and description', () => {
    render(<ErrorState title="Load failed" description="The request did not complete." />);
    expect(screen.getByText('Load failed')).toBeInTheDocument();
    expect(screen.getByText('The request did not complete.')).toBeInTheDocument();
  });

  it('renders the error message when an Error is passed', () => {
    render(<ErrorState error={new Error('Boom')} />);
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('renders a heading and request id', () => {
    render(<ErrorState title="Load failed" requestId="req-123" />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Load failed');
    expect(screen.getByText('req-123')).toBeInTheDocument();
  });

  it('invokes onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} retryLabel="Try again" />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides the retry button when onRetry is not provided', () => {
    render(<ErrorState title="x" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
