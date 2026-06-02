import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Breadcrumb } from '@/components/layout/breadcrumb';

const mockCrumbs = vi.fn();

vi.mock('@/hooks/layout/use-breadcrumb', () => ({
  useBreadcrumb: () => mockCrumbs(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Breadcrumb', () => {
  it('renders nothing when there are no ancestors (top-level route)', () => {
    mockCrumbs.mockReturnValue([{ label: 'Chat', href: '/chat', isCurrent: true }]);
    const { container } = render(<Breadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  it('renders ancestor links but not the current page name', () => {
    mockCrumbs.mockReturnValue([
      { label: 'Models', href: '/models', isCurrent: false },
      { label: 'Catalog', href: '/models/catalog', isCurrent: true },
    ]);
    render(<Breadcrumb />);
    const link = screen.getByRole('link', { name: 'Models' });
    expect(link).toHaveAttribute('href', '/models');
    // Current page name is owned by the topbar <h1>, not the breadcrumb.
    expect(screen.queryByText('Catalog')).not.toBeInTheDocument();
  });

  it('renders nothing when the hook returns an empty trail', () => {
    mockCrumbs.mockReturnValue([]);
    const { container } = render(<Breadcrumb />);
    expect(container.firstChild).toBeNull();
  });
});
