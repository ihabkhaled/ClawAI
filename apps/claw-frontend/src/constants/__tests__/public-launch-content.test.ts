import { describe, expect, it } from 'vitest';

import {
  PUBLIC_LAUNCH_CONTENT_BY_LOCALE,
  PUBLIC_LAUNCH_LABELS_BY_LOCALE,
} from '@/constants/public-launch-content.constants';
import { Locale } from '@/enums/locale.enum';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';

const COMMERCE_POLICY_SLUGS = [
  PublicLaunchPageSlug.DELIVERY_SHIPPING,
  PublicLaunchPageSlug.REFUND_CANCELLATION,
] as const;

// Japanese and Chinese say in ~100 characters what Latin scripts say in ~300.
const DENSE_SCRIPT_LOCALES: ReadonlySet<Locale> = new Set([Locale.JA, Locale.ZH]);

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
        // Dense scripts (zh, ja, …) say the same in far fewer characters: same floor as the commerce check.
        const minimum = DENSE_SCRIPT_LOCALES.has(locale) ? 60 : 120;
        expect(page.sections.every((section) => section.body.length > minimum)).toBe(true);
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

  it('translates the delivery and refund policies into every locale', () => {
    const english = PUBLIC_LAUNCH_CONTENT_BY_LOCALE[Locale.EN];
    for (const locale of Object.values(Locale)) {
      for (const slug of COMMERCE_POLICY_SLUGS) {
        const page = PUBLIC_LAUNCH_CONTENT_BY_LOCALE[locale][slug];
        const minimum = DENSE_SCRIPT_LOCALES.has(locale) ? 60 : 120;
        expect(page.sections).toHaveLength(4);
        expect(new Set(page.sections.map((section) => section.id)).size).toBe(4);
        for (const [index, section] of page.sections.entries()) {
          expect(section.body.length, `${locale}:${slug}:${section.id}`).toBeGreaterThan(minimum);
          expect(section.id).toBe(english[slug].sections[index]?.id);
          if (locale !== Locale.EN) {
            expect(section.body, `${locale}:${slug}:${section.id}`).not.toBe(
              english[slug].sections[index]?.body,
            );
          }
        }
        // How to reach us is part of both policies, in every language.
        expect(JSON.stringify(page)).toContain('admin@claw-ai.co');
      }
    }
  });

  it('keeps the commerce policies to the owner decisions: no phone, no invented windows', () => {
    const serialized = JSON.stringify(
      Object.values(PUBLIC_LAUNCH_CONTENT_BY_LOCALE).map((pages) =>
        COMMERCE_POLICY_SLUGS.map((slug) => pages[slug]),
      ),
    );
    expect(serialized).not.toMatch(/\+\d{2}|tel:/);
    expect(serialized).not.toMatch(/\b(7|14|30|60)[ -]?(day|days|jours|días|Tage|giorni|dias)\b/i);
  });

  it('translates the page chrome every launch page shows', () => {
    const english = PUBLIC_LAUNCH_LABELS_BY_LOCALE[Locale.EN];
    for (const locale of Object.values(Locale)) {
      const labels = PUBLIC_LAUNCH_LABELS_BY_LOCALE[locale];
      expect(labels.companyDetailsTitle.trim().length).toBeGreaterThan(0);
      if (locale !== Locale.EN) {
        expect(labels.onThisPage, locale).not.toBe(english.onThisPage);
        expect(labels.effectiveDate, locale).not.toBe(english.effectiveDate);
        expect(labels.addressNote, locale).not.toBe(english.addressNote);
      }
    }
  });
});
