import localFont from 'next/font/local';

/**
 * Self-hosted fonts (latin subset, OFL-licensed files from @fontsource; the licences sit beside the
 * files). They replace `next/font/google`: that loader downloads the fonts during `next build`, and
 * on 2026-10-27 Google's CSS answered with a font URL the loader could not parse
 * (`Cannot read properties of null (reading '1')`), which failed the CI frontend build at random.
 * A build must not depend on a third-party download.
 */
export const inter = localFont({
  src: [
    { path: './fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/inter-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const editorialDisplay = localFont({
  src: [
    { path: './fonts/archivo-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/archivo-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/archivo-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-editorial-display',
  preload: false,
});

export const editorialMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/ibm-plex-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-editorial-mono',
  preload: false,
});
