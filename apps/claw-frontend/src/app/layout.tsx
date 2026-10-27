import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';

import { AnalyticsHead } from '@/components/analytics/analytics-head';
import { AnalyticsNoscript } from '@/components/analytics/analytics-noscript';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { THEME_INIT_SCRIPT } from '@/constants/theme.constants';
import { loadDictionary } from '@/lib/i18n/dictionary-loader';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { buildRootMetadata } from '@/lib/seo/root-metadata';
import { getDirection, getHtmlLanguage, isSupportedLocale } from '@/utilities/locale.utility';

import { editorialDisplay, editorialMono, inter } from './fonts';
import './globals.css';
import { Providers } from './providers';

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
            anything above it is time the container never sees. AdSense is NOT
            mounted here on purpose — it lives only in the (marketing) layout,
            so the loader can never execute on auth/portal/payment routes. See
            rules/38-adsense-eligibility-and-low-value-content.md. */}
        <AnalyticsHead />
      </head>
      <body className="font-sans antialiased">
        {/* Google requires the no-script fallback immediately after <body>. */}
        <AnalyticsNoscript />
        {/* next/script docs place beforeInteractive scripts as a sibling of
            {children}, never inside the literal <head> JSX: Next hoists this
            into the pre-hydration HTML through its own side channel, and
            declaring it inside <head> instead routes it through React's
            document-head singleton reconciler, which cannot rebuild a
            <script> node on the client and throws. */}
        <Script id="theme-init" strategy="beforeInteractive" nonce={nonce}>
          {THEME_INIT_SCRIPT}
        </Script>
        <Providers initialLocale={locale} initialDictionary={dictionary}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
