import { render, screen } from '@testing-library/react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { forwardRef } from 'react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from '@/components/common/empty-state';

const MockIcon: LucideIcon = forwardRef<SVGSVGElement, LucideProps>(
  function MockIconInner(props, ref) {
    return <svg data-testid="mock-icon" ref={ref} {...props} />;
  },
);

describe('EmptyState', () => {
  it('renders the title', () => {
    render(
      <EmptyState
        icon={MockIcon}
        title="No items"
        description="There are no items yet."
      />,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(
      <EmptyState
        icon={MockIcon}
        title="No items"
        description="There are no items yet."
      />,
    );
    expect(screen.getByText('There are no items yet.')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(
      <EmptyState
        icon={MockIcon}
        title="No items"
        description="There are no items yet."
      />,
    );
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('renders an action button when provided', () => {
    render(
      <EmptyState
        icon={MockIcon}
        title="No items"
        description="There are no items yet."
        action={<button type="button">Add Item</button>}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Add Item' }),
    ).toBeInTheDocument();
  });

  it('does not render action container when action is not provided', () => {
    const { container } = render(
      <EmptyState
        icon={MockIcon}
        title="No items"
        description="There are no items yet."
      />,
    );
    const actionDivs = container.querySelectorAll('.mt-6');
    expect(actionDivs).toHaveLength(0);
  });

  it('renders title as an h3 heading', () => {
    render(
      <EmptyState
        icon={MockIcon}
        title="No items"
        description="There are no items yet."
      />,
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'No items',
    );
  });
});
