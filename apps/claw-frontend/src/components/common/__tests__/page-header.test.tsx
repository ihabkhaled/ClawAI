import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from '@/components/common/page-header';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the title as an h1 element', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Dashboard',
    );
  });

  it('renders the description when provided', () => {
    render(
      <PageHeader title="Dashboard" description="Welcome to the dashboard" />,
    );
    expect(screen.getByText('Welcome to the dashboard')).toBeInTheDocument();
  });

  it('does not render a description paragraph when not provided', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders actions when provided', () => {
    render(
      <PageHeader
        title="Dashboard"
        actions={<button type="button">Create</button>}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Create' }),
    ).toBeInTheDocument();
  });

  it('does not render the actions container when no actions provided', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    const wrappers = container.querySelectorAll('.flex.items-center.gap-2');
    expect(wrappers).toHaveLength(0);
  });
});
