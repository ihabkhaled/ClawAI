import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono, Inter } from 'next/font/google';
import { headers } from 'next/headers';

import { AdSenseHead } from '@/components/adsense/adsense-head';
import { AnalyticsHead } from '@/components/analytics/analytics-head';
import { AnalyticsNoscript } from '@/components/analytics/analytics-noscript';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { THEME_INIT_SCRIPT } from '@/constants/theme.constants';
import { loadDictionary } from '@/lib/i18n/dictionary-loader';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { buildRootMetadata } from '@/lib/seo/root-metadata';
import { getDirection, getHtmlLanguage, isSupportedLocale } from '@/utilities/locale.utility';

import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

const editorialDisplay = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-editorial-display',
  preload: false,
});

const editorialMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-editorial-mono',
  preload: false,
});

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1220' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const dictionary = await loadDictionary(locale);

  return (
    <html
      lang={getHtmlLanguage(locale)}
      dir={getDirection(locale)}
      suppressHydrationWarning
      className={`${inter.variable} ${editorialDisplay.variable} ${editorialMono.variable}`}
    >
      <head>
        {/* First in the head: GTM measures from the moment its snippet runs, so
            anything above it is time the container never sees. */}
        <AnalyticsHead />
        <AdSenseHead />
        <script
          nonce={nonce}
          suppressHydrationWarning
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="font-sans antialiased">
        {/* Google requires the no-script fallback immediately after <body>. */}
        <AnalyticsNoscript />
        <Providers initialLocale={locale} initialDictionary={dictionary}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
