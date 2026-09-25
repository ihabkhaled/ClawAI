import { describe, expect, it } from 'vitest';

import { PUBLIC_PAGE_SEO_BY_LOCALE } from '@/constants/public-page-seo.constants';
import { SITE_DESCRIPTION, SITE_SLOGAN, SITE_TITLE } from '@/constants/site-metadata.constants';
import { Locale } from '@/enums/locale.enum';
import { getDictionary } from '@/lib/i18n/translations';

/**
 * The 2026-09 repositioning: "Every AI, one workspace". Every key the slogan,
 * the description and the new homepage bands use must exist in all 13
 * locales, be translated (not the English string), and the old slogan must be
 * gone from each.
 */
const BAND_FIELDS = [
  'eyebrow',
  'title',
  'body',
  'point1Title',
  'point1Body',
  'point2Title',
  'point2Body',
  'point3Title',
  'point3Body',
  'ctaPrimary',
  'ctaSecondary',
] as const;

function keysFor(locale: Locale): Record<string, string> {
  const d = getDictionary(locale);
  const values: Record<string, string> = {
    'auth.tagline': d.auth.tagline,
    'auth.brandingHeadline': d.auth.brandingHeadline,
    'auth.brandingSubheadline': d.auth.brandingSubheadline,
    'marketing.footer.tagline': d.marketing.footer.tagline,
    'marketing.footer.featuresHeading': d.marketing.footer.featuresHeading,
    'marketing.home.hero.title': d.marketing.home.hero.title,
    'marketing.home.hero.subtitle': d.marketing.home.hero.subtitle,
    'seo.home.title': PUBLIC_PAGE_SEO_BY_LOCALE[locale].home.title,
    'seo.home.description': PUBLIC_PAGE_SEO_BY_LOCALE[locale].home.description,
  };
  for (const field of BAND_FIELDS) {
    values[`payg.${field}`] = d.marketing.home.payg[field];
    values[`teams.${field}`] = d.marketing.home.teams[field];
  }
  return values;
}

const english = keysFor(Locale.EN);

describe('repositioning slogan and homepage band keys', () => {
  it('uses the owner-approved English slogan and description', () => {
    expect(SITE_SLOGAN).toBe('Every AI, one workspace');
    expect(SITE_TITLE).toBe('ClawAI — Every AI, one workspace');
    expect(english['marketing.home.hero.title']).toBe(SITE_SLOGAN);
    expect(english['marketing.home.hero.subtitle']).toBe(SITE_DESCRIPTION);
    expect(english['seo.home.description']).toBe(SITE_DESCRIPTION);
  });

  it.each(Object.values(Locale))('%s: every key is present and non-empty', (locale) => {
    for (const [key, value] of Object.entries(keysFor(locale))) {
      expect(value.trim().length, `${locale}/${key}`).toBeGreaterThan(1);
    }
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s: every key is translated rather than English',
    (locale) => {
      for (const [key, value] of Object.entries(keysFor(locale))) {
        expect(value, `${locale}/${key}`).not.toBe(english[key]);
      }
    },
  );

  it.each(Object.values(Locale))(
    '%s: the hero title, sign-in headline and home SEO title share one slogan',
    (locale) => {
      const values = keysFor(locale);
      const slogan = values['marketing.home.hero.title'] ?? '';
      expect(values['auth.brandingHeadline']).toBe(values['marketing.home.hero.title']);
      expect(values['seo.home.title']).toBe(values['marketing.home.hero.title']);
      expect((values['auth.tagline'] ?? '').toLowerCase()).toContain(slogan.toLowerCase());
      expect(values['seo.home.description']?.length ?? 0).toBeGreaterThan(80);
    },
  );

  it.each(Object.values(Locale))('%s: the old "one subscription" slogan is gone', (locale) => {
    const d = getDictionary(locale);
    expect(d.marketing.home.hero.title.toLowerCase()).not.toContain('subscription');
    expect(d.auth.tagline.toLowerCase()).not.toContain('subscription');
  });
});
