import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import { LocaleContext, LocaleProvider } from '@/lib/i18n/locale-context';

// Mock the locale utility so we control hydration behavior
vi.mock('@/utilities/locale.utility', () => ({
  getStoredLocale: (): Locale => Locale.EN,
  getDirection: (locale: Locale): Direction =>
    locale === Locale.AR ? Direction.RTL : Direction.LTR,
  persistLocale: vi.fn(),
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
  it('renders children', () => {
    render(
      <LocaleProvider>
        <span data-testid="child">hello</span>
      </LocaleProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('hello');
  });

  it('provides the default locale when no initialLocale is given', () => {
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent(Locale.EN);
  });

  it('provides the initialLocale when specified', () => {
    render(
      <LocaleProvider initialLocale={Locale.AR}>
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent(Locale.AR);
  });

  it('provides LTR direction for English', () => {
    render(
      <LocaleProvider initialLocale={Locale.EN}>
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('dir')).toHaveTextContent(Direction.LTR);
  });

  it('provides RTL direction for Arabic', () => {
    render(
      <LocaleProvider initialLocale={Locale.AR}>
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
