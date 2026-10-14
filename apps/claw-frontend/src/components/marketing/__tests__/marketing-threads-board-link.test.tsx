import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingMobileMenu } from '@/components/marketing/marketing-mobile-menu';
import { MARKETING_NAV_LINKS } from '@/constants';
import { THREADS_PUBLIC_BOARD_PATH } from '@/constants/thread-board-guest.constants';
import { THREADS_PUBLIC_BOARD_PATH as SEO_BOARD_PATH } from '@/constants/threads-public-board-seo.constants';
import { Locale } from '@/enums/locale.enum';
import { getPublishedPages } from '@/utilities/content-registry.utility';
import { buildMarketingFooterData } from '@/utilities/marketing-footer-data.utility';

const NAV_KEY = 'chat.threadBoardGuestNavLabel';
const state = vi.hoisted(() => ({ locale: 'en' }));

vi.mock('@/lib/i18n', async () => {
  const { getTranslation } = await import('@/lib/i18n/translations');
  const { Locale: Locales } = await import('@/enums/locale.enum');
  const current = (): (typeof Locales)[keyof typeof Locales] =>
    Object.values(Locales).find((locale) => locale === state.locale) ?? Locales.EN;
  return {
    useTranslation: () => ({
      locale: current(),
      dir: 'ltr',
      t: (key: string) => getTranslation(current(), key),
    }),
    SUPPORTED_LOCALES: [{ locale: 'en', label: 'English', dir: 'ltr' }],
  };
});
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} alt={props.alt ?? ''} />,
}));
vi.mock('@/components/marketing/marketing-locale-switcher', () => ({
  MarketingLocaleSwitcher: () => <div />,
}));
vi.mock('@/components/marketing/marketing-theme-toggle', () => ({
  MarketingThemeToggle: () => <div />,
}));
vi.mock('@/components/marketing/marketing-auth-actions', () => ({
  MarketingAuthActions: () => <div />,
}));
vi.mock('@/components/common/currency-switcher', () => ({ CurrencySwitcher: () => <div /> }));
vi.mock('@/hooks/marketing/use-marketing-mobile-menu', () => ({
  useMarketingMobileMenu: () => ({ isOpen: false, setIsOpen: vi.fn(), close: vi.fn() }),
}));
vi.mock('@/stores/feedback-dialog.store', () => ({
  useFeedbackDialogStore: (select: (value: { openFeedback: () => void }) => unknown) =>
    select({ openFeedback: vi.fn() }),
}));

const ALL_LOCALES = Object.values(Locale);

afterEach(() => {
  state.locale = 'en';
});

describe('the public Threads board is easy to find', () => {
  it('has one path, shared by the nav and the SEO registry, that is a published page', () => {
    expect(THREADS_PUBLIC_BOARD_PATH).toBe(SEO_BOARD_PATH);
    expect(getPublishedPages().map((page) => page.canonicalPath)).toContain(
      THREADS_PUBLIC_BOARD_PATH,
    );
  });

  it('is a nav entry with an icon', () => {
    const link = MARKETING_NAV_LINKS.find((entry) => entry.href === THREADS_PUBLIC_BOARD_PATH);
    expect(link?.labelKey).toBe(NAV_KEY);
    expect(link?.icon).toBeDefined();
  });

  it('is in the desktop header nav with its icon', () => {
    render(<MarketingHeader />);

    const nav = screen.getAllByRole('navigation')[0];
    const link = within(nav as HTMLElement).getByRole('link', { name: 'Threads board' });
    expect(link).toHaveAttribute('href', '/threads/board');
    expect(link.querySelector('svg')).not.toBeNull();
  });

  it('is in the mobile menu with its icon', () => {
    render(
      <MarketingMobileMenu
        navLinks={MARKETING_NAV_LINKS}
        isOpen
        onOpenChange={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    const link = screen.getByRole('link', { name: 'Threads board' });
    expect(link).toHaveAttribute('href', '/threads/board');
    expect(link.querySelector('svg')).not.toBeNull();
  });

  it('is in the footer, once', () => {
    render(<MarketingFooter {...buildMarketingFooterData(Locale.EN)} />);

    const links = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/threads/board');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('Threads board');
  });

  it.each(ALL_LOCALES)(
    '%s has a real label in the header, the mobile menu and the footer',
    (locale) => {
      state.locale = locale;
      const { unmount } = render(<MarketingHeader />);
      const nav = screen.getAllByRole('navigation')[0] as HTMLElement;
      const link = within(nav)
        .getAllByRole('link')
        .find((entry) => entry.getAttribute('href') === '/threads/board');
      const label = link?.textContent ?? '';
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label).not.toContain('threadBoardGuest');
      expect(label).not.toContain('chat.');
      unmount();

      render(<MarketingFooter {...buildMarketingFooterData(locale)} />);
      const footerLink = screen
        .getAllByRole('link')
        .find((entry) => entry.getAttribute('href') === '/threads/board');
      expect(footerLink?.textContent).toBe(label.trim());
    },
  );
});
