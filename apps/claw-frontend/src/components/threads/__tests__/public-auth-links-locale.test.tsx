import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketingAuthActions } from '@/components/marketing/marketing-auth-actions';
import { BoardGuestBanner } from '@/components/threads/board/board-guest-banner';
import { BoardGuestPrompts } from '@/components/threads/board/board-guest-prompts';
import { MarketingAuthActionsVariant } from '@/enums';

/**
 * A link to the sign-in or sign-up screen on a public page must carry the reader's language
 * (/ar/login, not /login): the bare path is answered with a redirect to the English screen, so an
 * Arabic, Persian, Japanese or German reader would land on English and lose their language.
 */
const LOCALES = ['en', 'ar', 'fa', 'ja', 'de'] as const;

let currentLocale = 'en';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: currentLocale }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => `/${currentLocale}/threads/clear-writing`,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/hooks/auth/use-is-signed-in', () => ({ useIsSignedIn: () => false }));
vi.mock('@/hooks/auth/use-logout', () => ({
  useLogout: () => ({ logout: vi.fn(), isPending: false }),
}));

function hrefsToAuthScreens(): string[] {
  return screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '')
    .filter((href) => {
      const path = href.split('?')[0] ?? '';
      return path.endsWith('/login') || path.endsWith('/register');
    });
}

describe.each(LOCALES)('public page auth links in %s', (locale) => {
  beforeEach(() => {
    currentLocale = locale;
  });

  it('the guest banner links to /<locale>/login and /<locale>/register and returns to the same page', () => {
    render(<BoardGuestBanner />);

    const hrefs = hrefsToAuthScreens();
    expect(hrefs).toEqual([
      `/${locale}/login?returnTo=%2Fthreads%2Fclear-writing`,
      `/${locale}/register?returnTo=%2Fthreads%2Fclear-writing`,
    ]);
  });

  it('the inline guest prompt keeps the language on the sign-up link it derives', () => {
    render(
      <BoardGuestPrompts signInHref={`/${locale}/login?returnTo=%2Fthreads%2Fclear-writing`} />,
    );

    const hrefs = hrefsToAuthScreens();
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href.startsWith(`/${locale}/`)).toBe(true);
    }
  });

  it.each([MarketingAuthActionsVariant.MOBILE, MarketingAuthActionsVariant.DESKTOP])(
    'the marketing header (%s) links to the sign-in and sign-up screens in the page language',
    (variant) => {
      render(<MarketingAuthActions variant={variant} />);

      const hrefs = hrefsToAuthScreens();
      expect(hrefs).toEqual([`/${locale}/login`, `/${locale}/register`]);
    },
  );
});

const SOURCE_ROOT = join(process.cwd(), 'src');
const SCANNED = [
  'components/threads',
  'components/marketing',
  'components/auth',
  'app/(marketing)',
  'hooks/threads',
  'hooks/auth',
  'hooks/marketing',
  'utilities/thread-board-guest.utility.ts',
];
/** Files that name the sign-in screen only to hand a value on that the caller localises. */
const LOCALISED_BY_CALLER = new Set([
  // `redirectTo` defaults to the sign-in path and is localised where the router is called.
  'hooks/auth/use-logout.ts',
]);
const HELPERS = [
  'localise(',
  'localizeHref(',
  'localisePath(',
  'withLocaleOf(',
  'useAuthSwitchHref',
];
const AUTH_SCREEN = /ROUTES\.(?:LOGIN|REGISTER)\b|['"`]\/(?:login|register)\b/u;

function sourceFiles(path: string): string[] {
  const full = join(SOURCE_ROOT, path);
  if (statSync(full).isFile()) {
    return [full];
  }
  return readdirSync(full).flatMap((entry) => {
    if (entry === '__tests__') {
      return [];
    }
    const child = join(full, entry);
    if (statSync(child).isDirectory()) {
      return sourceFiles(relative(SOURCE_ROOT, child));
    }
    return /\.(?:ts|tsx)$/u.test(entry) && !/\.test\./u.test(entry) ? [child] : [];
  });
}

describe('no public-page link to sign-in or sign-up is written without the language', () => {
  const files = SCANNED.flatMap(sourceFiles);

  it('scans the public Thread, Board, marketing and auth sources', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files.map((file) => relative(SOURCE_ROOT, file).split(sep).join('/')))(
    '%s names /login and /register only through a locale helper',
    (name) => {
      if (LOCALISED_BY_CALLER.has(name)) {
        return;
      }
      const lines = readFileSync(join(SOURCE_ROOT, name), 'utf8').split('\n');
      const bare = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => AUTH_SCREEN.test(line) && !/^\s*(?:import|\/\/|\/\*|\*)/u.test(line))
        .filter(({ index }) => {
          const window = lines.slice(Math.max(0, index - 3), index + 1).join('\n');
          return !HELPERS.some((helper) => window.includes(helper));
        })
        .map(({ line, index }) => `${name}:${index + 1}: ${line.trim()}`);
      expect(bare).toEqual([]);
    },
  );
});
