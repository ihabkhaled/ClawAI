import { MARKETING_GITHUB_URL } from '@/constants/marketing-nav.constants';
import type { JsonLdObject } from '@/types/structured-data.types';

// Only facts the application and repository actually support — no
// fabricated ratings, reviews, prices, or provider endorsements.
export function buildWebsiteJsonLd(siteUrl: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ClawAI',
    url: siteUrl,
  };
}

export function buildOrganizationJsonLd(siteUrl: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ClawAI',
    url: siteUrl,
    sameAs: [MARKETING_GITHUB_URL],
  };
}

export function buildSoftwareApplicationJsonLd(siteUrl: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ClawAI',
    url: siteUrl,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Linux, Windows, macOS (self-hosted via Docker)',
  };
}

// Defense in depth against script-tag breakout even though every field
// above is a static, developer-controlled string (no user input reaches
// this function).
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}
