import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import { LocaleContext, LocaleProvider } from '@/lib/i18n/locale-context';
import { ar } from '@/lib/i18n/locales/ar';
import { en } from '@/lib/i18n/locales/en';

// Mock the locale utility so we control hydration behavior
vi.mock('@/utilities/locale.utility', () => ({
  getStoredLocale: (): Locale => Locale.EN,
  getDirection: (locale: Locale): Direction =>
    locale === Locale.AR ? Direction.RTL : Direction.LTR,
  getHtmlLanguage: (locale: Locale): string => locale,
  persistLocale: vi.fn(),
  parseLocaleFromPathname: (pathname: string): Locale | null => {
    const segment = pathname.split('/')[1];
    return segment === Locale.AR || segment === Locale.EN ? (segment as Locale) : null;
  },
}));

// No locale segment by default, so the tests that assert the server-rendered
// prop wins are testing exactly that.
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: (): string => mockPathname,
}));

function TestConsumer(): React.ReactElement {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return <span data-testid="no-context">no context</span>;
  }
  return (
    <div>
      <span data-testid="locale">{ctx.locale}</span>
      <span data-testid="dir">{ctx.dir}</span>
    </div>
  );
}

describe('LocaleProvider', () => {
  it('renders children with the URL-derived dictionary', () => {
    render(
      <LocaleProvider initialLocale={Locale.EN} initialDictionary={en}>
        <span data-testid="child">hello</span>
      </LocaleProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('hello');
  });

  it('provides the initialLocale when specified', () => {
    render(
      <LocaleProvider initialLocale={Locale.AR} initialDictionary={ar}>
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent(Locale.AR);
  });

  it('provides LTR direction for English', () => {
    render(
      <LocaleProvider initialLocale={Locale.EN} initialDictionary={en}>
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('dir')).toHaveTextContent(Direction.LTR);
  });

  it('provides RTL direction for Arabic', () => {
    render(
      <LocaleProvider initialLocale={Locale.AR} initialDictionary={ar}>
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('dir')).toHaveTextContent(Direction.RTL);
  });
});

describe('LocaleContext without provider', () => {
  it('returns undefined when used outside a provider', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('no-context')).toHaveTextContent('no context');
  });
});

describe('LocaleProvider — direction follows the URL, not just the first render', () => {
  afterEach(() => {
    mockPathname = '/';
  });

  it('flips <html dir> when a client transition changes the locale segment', () => {
    // Signing in on /ar as an English-preference user does exactly this
    // transition. React never patches <html> attributes after hydration, so
    // without watching the path the dictionary went English while dir stayed
    // rtl — English text in a right-to-left sidebar.
    mockPathname = '/ar/login';
    const { rerender } = render(
      <LocaleProvider initialLocale={Locale.AR} initialDictionary={ar}>
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(document.documentElement.dir).toBe(Direction.RTL);

    mockPathname = '/en/chat';
    rerender(
      <LocaleProvider initialLocale={Locale.AR} initialDictionary={ar}>
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(document.documentElement.dir).toBe(Direction.LTR);
    expect(document.documentElement.lang).toBe(Locale.EN);
  });

  it('falls back to the server locale on a path with no locale segment', () => {
    mockPathname = '/';
    render(
      <LocaleProvider initialLocale={Locale.AR} initialDictionary={ar}>
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(document.documentElement.dir).toBe(Direction.RTL);
  });
});
