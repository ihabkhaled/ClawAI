import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { getPublishedPages } from '@/utilities';

// Mock factories are hoisted above imports, so they must not reference
// imported bindings (e.g. the Locale enum) — use the equivalent literal
// string values instead.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
  SUPPORTED_LOCALES: [{ locale: 'en', label: 'English', dir: 'ltr' }],
}));

vi.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'en', dir: 'ltr', setLocale: vi.fn() }),
}));

vi.mock('@/hooks/use-locale-navigation', () => ({
  useLocaleNavigation: () => ({ replaceLocale: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} alt={props.alt ?? ''} />,
}));

describe('MarketingFooter', () => {
  it('renders GitHub and documentation links pointing at the real repository', () => {
    render(<MarketingFooter />);
    expect(screen.getByText('marketing.footer.github')).toHaveAttribute(
      'href',
      'https://github.com/ihabkhaled/ClawAI',
    );
    expect(screen.getByText('marketing.footer.documentation')).toHaveAttribute(
      'href',
      'https://github.com/ihabkhaled/ClawAI/tree/main/docs',
    );
  });

  it('only links to PUBLISHED registry pages, never a PLANNED slug', () => {
    render(<MarketingFooter />);
    const publishedPaths = new Set(getPublishedPages().map((page) => page.canonicalPath));
    // Auth/app entry points and same-page anchors (/#pricing) are not registry
    // content, so they are exempt. The guarantee under test is narrower and
    // still intact: any link that looks like a marketing route must resolve to
    // a PUBLISHED entry, never a PLANNED one.
    const nonRegistryLinks = new Set(['/', '/login', '/register', '/chat']);
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      const isKnownStaticLink =
        href.startsWith('http') || href.startsWith('/#') || nonRegistryLinks.has(href);
      if (!isKnownStaticLink) {
        expect(publishedPaths.has(href)).toBe(true);
      }
    }
  });

  it('hides social links when none are configured', () => {
    render(<MarketingFooter />);
    expect(screen.queryByText('marketing.footer.socialX')).not.toBeInTheDocument();
  });
});
