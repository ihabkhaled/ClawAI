import type { Metadata } from 'next';

import {
  SITE_DESCRIPTION,
  SITE_TITLE,
  SOCIAL_PREVIEW_IMAGE_ALT,
  SOCIAL_PREVIEW_IMAGE_PATH,
} from '@/constants/site-metadata.constants';
import { getAdSenseConfig } from '@/lib/adsense/adsense-config';
import { getSiteUrl } from '@/lib/site/site-config';

export function buildRootMetadata(): Metadata {
  const adsenseClientId = getAdSenseConfig().clientId;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: SITE_TITLE, template: '%s | ClawAI' },
    description: SITE_DESCRIPTION,
    icons: {
      icon: '/icon.png',
      apple: '/apple-icon.png',
      shortcut: '/favicon.ico',
    },
    manifest: '/manifest.webmanifest',
    applicationName: 'ClawAI',
    creator: 'ClawAI',
    publisher: 'ClawAI',
    category: 'technology',
    referrer: 'origin-when-cross-origin',
    ...(adsenseClientId === null ? {} : { other: { 'google-adsense-account': adsenseClientId } }),
    openGraph: {
      type: 'website',
      siteName: 'ClawAI',
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: SOCIAL_PREVIEW_IMAGE_PATH,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: SOCIAL_PREVIEW_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [SOCIAL_PREVIEW_IMAGE_PATH],
    },
  };
}
