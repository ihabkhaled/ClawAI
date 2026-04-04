import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ComponentSize } from '@/enums';

describe('LoadingSpinner', () => {
  it('renders with default label "Loading..."', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with a custom label', () => {
    render(<LoadingSpinner label="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has correct aria-label matching the label prop', () => {
    render(<LoadingSpinner label="Please wait" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Please wait',
    );
  });

  it('has default aria-label "Loading..."', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading...',
    );
  });

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size={ComponentSize.SM} />);
    const svg = container.querySelector('svg');
    const classes = svg?.getAttribute('class') ?? '';
    expect(classes).toContain('h-4');
    expect(classes).toContain('w-4');
  });

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size={ComponentSize.LG} />);
    const svg = container.querySelector('svg');
    const classes = svg?.getAttribute('class') ?? '';
    expect(classes).toContain('h-12');
    expect(classes).toContain('w-12');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="mt-10" />);
    expect(screen.getByRole('status').className).toContain('mt-10');
  });
});
