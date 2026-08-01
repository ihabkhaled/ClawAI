import { describe, expect, it } from 'vitest';

import { PUBLIC_LAUNCH_CONTENT_BY_LOCALE } from '@/constants/public-launch-content.constants';
import { Locale } from '@/enums/locale.enum';

const LAUNCH_SLUGS = [
  'about',
  'pricing',
  'supported-models',
  'security-and-privacy',
  'privacy',
  'terms',
  'cookies',
  'acceptable-use',
] as const;

describe('public launch page content', () => {
  it('provides substantive content for every launch page and locale', () => {
    for (const locale of Object.values(Locale)) {
      const localePages = PUBLIC_LAUNCH_CONTENT_BY_LOCALE[locale];

      for (const slug of LAUNCH_SLUGS) {
        const page = localePages[slug];
        expect(page.eyebrow.trim().length).toBeGreaterThan(0);
        expect(page.sections).toHaveLength(4);
        expect(page.sections.every((section) => section.body.length > 120)).toBe(true);
        expect(new Set(page.sections.map((section) => section.id)).size).toBe(4);
      }
    }
  });

  it('keeps unsupported promises and stale model versions out of launch copy', () => {
    const serialized = JSON.stringify(PUBLIC_LAUNCH_CONTENT_BY_LOCALE);

    expect(serialized).not.toMatch(/SOC 2|ISO 27001|HIPAA|GDPR compliant/i);
    expect(serialized).not.toMatch(/GPT-5|Claude Opus 5|Gemini 3|Grok 4|Amazon Bedrock/i);
    expect(serialized).not.toMatch(/we never sell|we never train/i);
  });
});
