import { describe, expect, it } from 'vitest';

import { FEATURES_CLUSTER_CONTENT_BY_LOCALE } from '@/constants/features-cluster-content.constants';
import {
  FEATURES_CAPABILITY_ORDER,
  FEATURES_FLAGSHIP_REVIEW_DATE,
  getFeatureCapabilityPath,
  getFeatureCapabilityReviewDate,
  getFeatureCapabilitySlug,
} from '@/constants/features-cluster.constants';
import { FEATURES_FLAGSHIP_CONTENT_BY_LOCALE } from '@/constants/features-flagship-content.constants';
import { MARKETING_FOOTER_FEATURE_PATHS } from '@/constants/marketing-footer.constants';
import { FeatureCapability } from '@/enums/feature-capability.enum';
import { Locale } from '@/enums/locale.enum';
import { buildLlmsTxt } from '@/lib/discovery/llms-txt.service';
import type { FeatureFlagshipCapability } from '@/types/features-cluster.types';
import {
  getFeedPagesForLocale,
  getIndexablePagesForLocale,
  getPageBySlugAndLocale,
} from '@/utilities/content-registry.utility';

/**
 * The flagship `/features/<capability>` pages (2026-09 repositioning). The
 * cluster-wide structural and length checks live in
 * `features-cluster-content-locale-completeness.test.ts`; this file checks
 * what is specific to the new pages: every one is discoverable, every locale
 * is a real translation, and the claims audited as NOT shipped stay honest.
 */
const FLAGSHIP_CAPABILITIES = Object.keys(
  FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.EN].capabilities,
) as FeatureFlagshipCapability[];
const NON_ENGLISH = Object.values(Locale).filter((locale) => locale !== Locale.EN);

function prose(locale: Locale, capability: FeatureFlagshipCapability): string[] {
  const content = FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[locale].capabilities[capability];
  return [
    content.title,
    content.summary,
    content.productNote,
    ...content.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ...content.faq.flatMap((entry) => [entry.question, entry.answer]),
  ];
}

describe('/features flagship pages', () => {
  it('ships eleven flagship pages, all in the render order', () => {
    expect(FLAGSHIP_CAPABILITIES).toHaveLength(11);
    for (const capability of FLAGSHIP_CAPABILITIES) {
      expect(FEATURES_CAPABILITY_ORDER).toContain(capability);
      expect(getFeatureCapabilityReviewDate(capability)).toBe(FEATURES_FLAGSHIP_REVIEW_DATE);
    }
  });

  it.each(Object.values(Locale))(
    '%s: every flagship page is published, indexable and in the feed',
    (locale) => {
      const indexable = new Set(getIndexablePagesForLocale(locale).map((page) => page.slug));
      const feed = new Set(getFeedPagesForLocale(locale).map((page) => page.slug));
      for (const capability of FLAGSHIP_CAPABILITIES) {
        const slug = getFeatureCapabilitySlug(capability);
        const entry = getPageBySlugAndLocale(slug, locale);
        expect(entry?.title, `${locale}/${slug}`).toBe(
          FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[locale].capabilities[capability].seo.title,
        );
        expect(indexable.has(slug), `${locale}/${slug} indexable`).toBe(true);
        expect(feed.has(slug), `${locale}/${slug} feed`).toBe(true);
      }
    },
  );

  it('lists every flagship page in llms.txt', () => {
    const llms = buildLlmsTxt();
    for (const capability of FLAGSHIP_CAPABILITIES) {
      expect(llms).toContain(getFeatureCapabilityPath(capability));
    }
  });

  it('links every flagship page from the footer Features column', () => {
    expect([...MARKETING_FOOTER_FEATURE_PATHS].sort()).toEqual(
      FLAGSHIP_CAPABILITIES.map(getFeatureCapabilityPath).sort(),
    );
  });

  it('merges the flagship pages into every locale of the cluster dictionary', () => {
    for (const locale of Object.values(Locale)) {
      const cluster = FEATURES_CLUSTER_CONTENT_BY_LOCALE[locale];
      for (const capability of FEATURES_CAPABILITY_ORDER) {
        expect(cluster.capabilities[capability], `${locale}/${capability}`).toBeDefined();
        expect(
          cluster.hub.cardSummaries[capability].length,
          `${locale}/${capability}`,
        ).toBeGreaterThan(20);
      }
    }
  });

  it.each(NON_ENGLISH)('%s: body copy is a real translation, not English', (locale) => {
    for (const capability of FLAGSHIP_CAPABILITIES) {
      const english = new Set(prose(Locale.EN, capability));
      const localized = prose(locale, capability);
      const copied = localized.filter((value) => english.has(value));
      expect(copied, `${locale}/${capability}`).toEqual([]);
    }
  });

  it.each(Object.values(Locale))(
    '%s: the administration page never claims seats, invitations or single sign-on ship',
    (locale) => {
      const faq =
        FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[locale].capabilities[
          FeatureCapability.ADMINISTRATION_AND_ACCESS
        ].faq;
      // The "not yet" answer is the second FAQ in every locale.
      expect(faq[1]?.answer.length ?? 0).toBeGreaterThan(40);
    },
  );

  it('keeps the English copy free of claims the code audit ruled out', () => {
    const english = FLAGSHIP_CAPABILITIES.flatMap((capability) => prose(Locale.EN, capability))
      .join('\n')
      .toLowerCase();
    expect(english).not.toContain('status page');
    expect(english).not.toContain('signed url');
    expect(english).not.toContain('stripe');
    expect(english).not.toContain('captcha solving');
  });
});
