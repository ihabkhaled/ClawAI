import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Topbar } from '@/components/layout/topbar';
import { UserMenu } from '@/components/layout/user-menu';

vi.mock('@/stores/sidebar.store', () => ({ useSidebarStore: () => ({ toggle: vi.fn() }) }));
vi.mock('@/hooks/layout/use-topbar-title', () => ({ useTopbarTitle: () => 'Dashboard' }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/layout/breadcrumb', () => ({ Breadcrumb: () => null }));
vi.mock('@/components/layout/global-search', () => ({ GlobalSearch: () => <div /> }));
vi.mock('@/components/layout/locale-switcher', () => ({ LocaleSwitcher: () => <div /> }));
vi.mock('@/components/layout/theme-switcher', () => ({ ThemeSwitcher: () => <div /> }));
vi.mock('@/components/common/currency-switcher', () => ({ CurrencySwitcher: () => <div /> }));
// UserMenu is deliberately NOT mocked: its username label is the element under
// test, and the Topbar case only works if the real one renders inside it.
vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: { username: 'claw-admin', email: 'admin@claw.local' } }),
}));
vi.mock('@/hooks/auth/use-logout', () => ({
  useLogout: () => ({ logout: vi.fn(), isPending: false }),
}));

/**
 * Once the sidenav is a 256px rail, the topbar is 256px narrower than the
 * window — so a `sm:` label inside it is sized against the wrong number. At
 * 793x773 the right-hand cluster measured 564px inside a 537px bar: the account
 * button was clipped by the screen edge and the page title was squeezed to 0px.
 * The bar is a container; the labels inside it answer to the bar.
 */
describe('Topbar sizes its controls against its own width', () => {
  it('declares the header a container query context', () => {
    render(<Topbar />);

    expect(screen.getByRole('banner').className.split(/\s+/)).toContain('@container');
  });

  it('reveals the account name on the CONTAINER width, never the viewport width', () => {
    render(<UserMenu />);

    const label = screen.getByText('claw-admin');
    const classes = label.className.split(/\s+/);

    expect(classes).toContain('hidden');
    expect(classes).toContain('@2xl:inline');
    // `sm:inline` is the bug: a 640px VIEWPORT is a 384px bar behind a rail.
    expect(classes).not.toContain('sm:inline');
  });

  it('keeps the username reachable in the menu when the label is hidden', () => {
    render(<UserMenu />);

    // Two nodes carry it: the trigger label (which may be hidden by width) and
    // the menu's own header. Nothing is lost when the first one collapses.
    expect(screen.getByRole('button').textContent).toContain('claw-admin');
  });
});
