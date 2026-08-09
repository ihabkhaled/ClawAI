import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Topbar } from '@/components/layout/topbar';

vi.mock('@/stores/sidebar.store', () => ({
  useSidebarStore: () => ({ toggle: vi.fn() }),
}));
vi.mock('@/hooks/layout/use-topbar-title', () => ({ useTopbarTitle: () => 'Dashboard' }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/layout/breadcrumb', () => ({ Breadcrumb: () => null }));
vi.mock('@/components/layout/global-search', () => ({ GlobalSearch: () => <div /> }));
vi.mock('@/components/layout/locale-switcher', () => ({ LocaleSwitcher: () => <div /> }));
vi.mock('@/components/layout/theme-switcher', () => ({ ThemeSwitcher: () => <div /> }));
vi.mock('@/components/layout/user-menu', () => ({ UserMenu: () => <div /> }));

describe('Topbar mobile layout', () => {
  it('constrains the sticky header to the viewport width', () => {
    render(<Topbar />);

    expect(screen.getByRole('banner')).toHaveClass('w-full', 'min-w-0');
  });
});
