import type { PublicThreadPublication } from '@/types/thread-publication.types';
import { threadCanonicalUrl, threadTranslatedUrl } from '@/utilities/thread-slug.utility';

/**
 * The page's own address and its language versions. A translated copy canonicalises to itself, so
 * search engines index each language as its own page; the written language keeps its own address
 * and `x-default` (ADR-217).
 */
export function threadPageAddresses(
  siteUrl: string,
  publication: PublicThreadPublication,
): { canonical: string; languages: Record<string, string> } {
  const sourceLocale = publication.sourceLocale ?? publication.contentLocale;
  const original = threadCanonicalUrl(siteUrl, sourceLocale, publication.slug);
  const languages: Record<string, string> = { [sourceLocale]: original, 'x-default': original };
  for (const locale of publication.availableLocales ?? []) {
    if (locale !== sourceLocale) {
      languages[locale] = threadTranslatedUrl(siteUrl, locale, publication.slug);
    }
  }
  return {
    canonical:
      publication.translated === true
        ? threadTranslatedUrl(siteUrl, publication.contentLocale, publication.slug)
        : original,
    languages,
  };
}
