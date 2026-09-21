import { render, screen } from '@testing-library/react';
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
    expect(screen.getByTestId('locale-switcher')).toBeInTheDocument();
  });

  it('is not hidden below a breakpoint by any ancestor', () => {
    render(<Topbar />);

    // `hidden` with a `sm:block` sibling class is exactly the regression: it
    // reads as "visible" in the source and is invisible on a phone.
    expect(classChain(screen.getByTestId('locale-switcher'))).not.toContain('hidden');
  });
});
