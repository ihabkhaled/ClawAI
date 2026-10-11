import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Topbar } from '@/components/layout/topbar';

/**
 * Reported 2026-09-21: there was no way to change language on a phone.
 *
 * The portal renders the language control in exactly one place — the topbar —
 * and it was wrapped in `hidden sm:block`, so below 640px it did not exist.
 * Neither the sidebar, the user menu nor the bottom navigation carries one, so
 * the only route left was the Settings page, which a visitor who cannot read
 * the current language cannot find.
 *
 * This suite fails if anything hides it behind a breakpoint again. It asserts
 * on the ancestor chain rather than on a screenshot, because the defect is a
 * CSS class, not a layout accident.
 */
vi.mock('@/stores/sidebar.store', () => ({
  useSidebarStore: () => ({ toggle: vi.fn() }),
}));
vi.mock('@/hooks/layout/use-topbar-title', () => ({ useTopbarTitle: () => 'Dashboard' }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/layout/breadcrumb', () => ({ Breadcrumb: () => null }));
vi.mock('@/components/layout/global-search', () => ({ GlobalSearch: () => <div /> }));
vi.mock('@/components/layout/currency-switcher', () => ({ CurrencySwitcher: () => <div /> }));
vi.mock('@/components/layout/theme-switcher', () => ({ ThemeSwitcher: () => <div /> }));
vi.mock('@/components/layout/user-menu', () => ({ UserMenu: () => <div /> }));
vi.mock('@/components/notifications/notification-bell', () => ({
  NotificationBell: () => <div />,
}));
vi.mock('@/components/layout/locale-switcher', () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));

/** Every class on the element and each of its ancestors, flattened. */
function classChain(element: HTMLElement): string[] {
  const classes: string[] = [];
  let node: HTMLElement | null = element;
  while (node !== null) {
    classes.push(...Array.from(node.classList));
    node = node.parentElement;
  }
  return classes;
}

describe('the language control is reachable at every width', () => {
  it('renders in the portal topbar', () => {
    render(<Topbar />);
    expect(screen.getAllByTestId('locale-switcher').length).toBeGreaterThan(0);
  });

  it('sits inline on a wide bar and is hidden there only by a container-width breakpoint', () => {
    render(<Topbar />);
    const inline = screen.getAllByTestId('locale-switcher')[0];
    expect(inline).toBeDefined();
    const chain = classChain(inline as HTMLElement);
    // Hidden below the bar's @3xl width, shown from there up: never `hidden` without a matching
    // `@3xl:flex` on the same wrapper.
    expect(chain).toContain('@3xl:flex');
  });

  it('is always reachable on a narrow bar through the More panel', () => {
    render(<Topbar />);
    fireEvent.click(screen.getByTestId('topbar-overflow-trigger'));
    const panel = screen.getByTestId('topbar-overflow-panel');
    expect(within(panel).getByTestId('locale-switcher')).toBeInTheDocument();
  });

  it('keeps the More button visible on a narrow bar and hides it on a wide one', () => {
    render(<Topbar />);
    expect(classChain(screen.getByTestId('topbar-overflow-trigger'))).toContain('@3xl:hidden');
  });
});
