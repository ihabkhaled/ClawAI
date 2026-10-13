import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tStub as t } from '@/components/observability/explorer/__tests__/explorer-fixtures';
import { ObservabilityNav } from '@/components/observability/pages/observability-nav';

let mockPath = '/observability';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPath,
}));

beforeEach(() => {
  mockPath = '/observability';
});

describe('ObservabilityNav', () => {
  it('is a labelled navigation with a link to every page', () => {
    render(<ObservabilityNav canViewSystem sharedQuery="" t={t} />);
    const nav = screen.getByRole('navigation', { name: 'observabilityPages.navLabel' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/observability',
      '/observability/users',
      '/observability/providers',
      '/observability/models',
      '/observability/plans',
      '/observability/surfaces',
      '/observability/consumption',
      '/observability/tracing',
      '/observability/failures',
    ]);
  });

  it('keeps the period and filters on every link', () => {
    render(<ObservabilityNav canViewSystem sharedQuery="period=30d&provider=GEMINI" t={t} />);
    expect(screen.getByRole('link', { name: 'observabilityPages.navUsers' })).toHaveAttribute(
      'href',
      '/observability/users?period=30d&provider=GEMINI',
    );
  });

  it('marks the current page, and only that page, with aria-current', () => {
    mockPath = '/observability/users';
    render(<ObservabilityNav canViewSystem sharedQuery="" t={t} />);
    const current = screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('observabilityPages.navUsers');
  });

  it('keeps a list highlighted on its detail page, but not the hub', () => {
    mockPath = '/observability/providers/GEMINI';
    render(<ObservabilityNav canViewSystem sharedQuery="" t={t} />);
    expect(screen.getByRole('link', { name: 'observabilityPages.navProviders' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'observabilityPages.navHub' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('highlights the hub only on the hub', () => {
    render(<ObservabilityNav canViewSystem sharedQuery="" t={t} />);
    expect(screen.getByRole('link', { name: 'observabilityPages.navHub' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('hides the system pages (hub and failures) from an admin without system access', () => {
    render(<ObservabilityNav canViewSystem={false} sharedQuery="" t={t} />);
    expect(
      screen.queryByRole('link', { name: 'observabilityPages.navFailures' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'observabilityPages.navHub' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(7);
    expect(screen.getByRole('link', { name: 'observabilityPages.navUsers' })).toBeInTheDocument();
  });

  it('scrolls sideways on a phone with a fade at the end edge, using logical classes only', () => {
    render(<ObservabilityNav canViewSystem sharedQuery="" t={t} />);
    const list = screen.getByRole('list');
    expect(list.className).toContain('overflow-x-auto');
    expect(list.className).toContain('scroll-fade-inline-end');
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-/u);
      expect(link.className).toContain('min-h-11');
    }
  });
});
