import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { THEME_INIT_SCRIPT } from '@/constants/theme.constants';

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
  title: 'Claw - AI Orchestration Platform',
  description:
    'Local-first AI orchestration platform for managing connectors, models, and conversations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
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
