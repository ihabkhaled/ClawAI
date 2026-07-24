import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';

import { SITE_DESCRIPTION, SITE_TITLE } from '@/constants/site-metadata.constants';
import { THEME_INIT_SCRIPT } from '@/constants/theme.constants';
// Imported directly from i18n.constants rather than the `@/lib/i18n` barrel
// — this is a server component, and that barrel also re-exports the
// 'use client' LocaleProvider/LocaleContext, which can pull React's
// createContext into the server bundle and break the production build.
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import { getDirection } from '@/utilities/locale.utility';

import './globals.css';
import { Providers } from './providers';

// Inter is loaded through next/font/google so the font is self-hosted, the
// most-used weights (400 / 500 / 600 / 700) are preloaded with `<link rel=
// "preload" as="font">` (next/font does this automatically when `preload:
// true`), and `font-display: swap` keeps text painted while the font
// downloads. The CSS variable `--font-inter` is consumed by globals.css's
// `--font-sans` stack.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: SITE_TITLE, template: '%s | ClawAI' },
  description: SITE_DESCRIPTION,
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'ClawAI',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // The nonce is stamped onto the request headers by middleware. Reading it
  // here authorises the inline theme-init script under the strict CSP and
  // opts the tree into per-request rendering (unavoidable for nonce CSP —
  // a static HTML file cannot carry a unique per-request nonce).
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html
      lang={DEFAULT_LOCALE}
      dir={getDirection(DEFAULT_LOCALE)}
      suppressHydrationWarning
      className={inter.variable}
    >
      <head>
        <script
          nonce={nonce}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
