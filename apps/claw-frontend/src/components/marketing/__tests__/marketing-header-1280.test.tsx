import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarketingHeader } from '@/components/marketing/marketing-header';

/**
 * At exactly 1280px the desktop bar (seven links plus the action cluster) was 34px wider than the
 * viewport and clipped "Create account". Between 1280px and 1535px the nav gap and the side
 * padding are tighter, and the action cluster refuses to shrink, so the call to action stays
 * whole and visible.
 */
vi.mock('@/hooks/marketing/use-marketing-locale-switcher', () => ({
  useMarketingLocaleSwitcher: () => ({
    locale: 'en',
    options: [{ locale: 'en', label: 'English' }],
    handleLocaleChange: vi.fn(),
    isPending: false,
  }),
}));
vi.mock('@/hooks/auth/use-logout', () => ({
  useLogout: () => ({ logout: vi.fn(), isPending: false }),
}));
let currentLocale = 'en';
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: currentLocale }),
}));
vi.mock('@/components/layout/currency-switcher', () => ({ CurrencySwitcher: () => <div /> }));
vi.mock('@/components/marketing/marketing-theme-toggle', () => ({
  MarketingThemeToggle: () => <div />,
}));
vi.mock('@/components/marketing/marketing-mobile-menu', () => ({
  MarketingMobileMenu: () => null,
}));

describe('the marketing header at the xl breakpoint', () => {
  it('uses a tighter nav gap and side padding until 2xl', () => {
    const { container } = render(<MarketingHeader />);
    const bar = container.querySelector('header > div');
    const nav = screen.getByRole('navigation');

    expect(bar?.className).toContain('lg:px-6');
    expect(bar?.className).toContain('2xl:px-8');
    expect(nav.className).toContain('gap-4');
    expect(nav.className).toContain('2xl:gap-6');
  });

  it('keeps the Create account button in the desktop cluster, which never shrinks', () => {
    render(<MarketingHeader />);
    const cta = screen.getAllByRole('link', { name: 'marketing.header.createAccount' })[0];
    const cluster = cta?.closest('div.shrink-0');

    expect(cluster?.className).toContain('shrink-0');
  });

  it.each(['de', 'ru', 'fr', 'es', 'pt', 'it'])(
    'keeps the hamburger until 2xl for the wide locale %s',
    (locale) => {
      currentLocale = locale;
      render(<MarketingHeader />);
      const nav = screen.getByRole('navigation');

      expect(nav.className).toContain('2xl:flex');
      expect(nav.className).not.toContain('xl:flex ');
      currentLocale = 'en';
    },
  );

  it('keeps the xl desktop bar for a short locale', () => {
    currentLocale = 'en';
    render(<MarketingHeader />);

    expect(screen.getByRole('navigation').className.split(' ')).toContain('xl:flex');
  });
});
