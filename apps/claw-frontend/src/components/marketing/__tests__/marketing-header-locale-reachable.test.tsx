import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarketingHeader } from '@/components/marketing/marketing-header';

/**
 * Companion to the portal's locale-switcher-always-reachable suite.
 *
 * On marketing, the language control lived inside a cluster gated `xl:flex`.
 * Below 1280px the only always-visible copy was in the footer, at the bottom
 * of a long page, and the other was behind a hamburger labelled "Menu" — which
 * is unreadable to the very person who needs to change language. It now sits
 * in the bar at every width.
 *
 * The header deliberately contains TWO switchers (one per breakpoint cluster),
 * so this asserts placement, not count: one of them must be outside anything
 * hidden below a breakpoint.
 */
vi.mock('@/hooks/marketing/use-marketing-locale-switcher', () => ({
  useMarketingLocaleSwitcher: () => ({
    locale: 'en',
    options: [{ locale: 'en', label: 'English' }],
    handleLocaleChange: vi.fn(),
    isPending: false,
  }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/components/layout/currency-switcher', () => ({ CurrencySwitcher: () => <div /> }));
vi.mock('@/components/marketing/marketing-theme-toggle', () => ({
  MarketingThemeToggle: () => <div />,
}));
vi.mock('@/components/marketing/marketing-mobile-menu', () => ({
  MarketingMobileMenu: () => null,
}));

/** True when this element, or any ancestor, is hidden until a breakpoint. */
function isBreakpointHidden(element: HTMLElement): boolean {
  let node: HTMLElement | null = element;
  while (node !== null) {
    if (node.classList.contains('hidden')) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

describe('the marketing header carries a language control at every width', () => {
  it('renders at least one switcher that is not gated behind a breakpoint', () => {
    render(<MarketingHeader />);

    const switchers = screen.getAllByRole('button', { name: /Select language|languageSwitcher/u });
    expect(switchers.length).toBeGreaterThan(0);
    expect(switchers.some((button) => !isBreakpointHidden(button))).toBe(true);
  });
});
