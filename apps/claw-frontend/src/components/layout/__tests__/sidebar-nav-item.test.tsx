import { render, screen } from '@testing-library/react';
import { Cpu } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarNavItem } from '@/components/layout/sidebar-nav-item';
import type { SidebarItem } from '@/constants';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/layout/use-sidebar-nav-item-state', () => ({
  useSidebarNavItemState: () => ({ expanded: true, toggle: vi.fn() }),
}));

describe('SidebarNavItem service availability', () => {
  it('renders a disabled leaf without a navigable link', () => {
    const item: SidebarItem = {
      labelKey: 'nav.modelLocalFrontier',
      href: '/models/local-frontier',
      icon: Cpu,
      disabled: true,
    };

    render(<SidebarNavItem item={item} />);

    expect(screen.queryByRole('link', { name: 'nav.modelLocalFrontier' })).not.toBeInTheDocument();
    expect(
      screen.getByText('nav.modelLocalFrontier').closest('[aria-disabled="true"]'),
    ).not.toBeNull();
  });

  it('keeps a disabled parent expandable while removing parent navigation', () => {
    const item: SidebarItem = {
      labelKey: 'nav.models',
      href: '/models',
      icon: Cpu,
      disabled: true,
      children: [
        {
          labelKey: 'nav.modelCatalog',
          href: '/models/catalog',
          icon: Cpu,
          disabled: true,
        },
      ],
    };

    render(<SidebarNavItem item={item} />);

    expect(screen.queryByRole('link', { name: 'nav.models' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.collapse' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
