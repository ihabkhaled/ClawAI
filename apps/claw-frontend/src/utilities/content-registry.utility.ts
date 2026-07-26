import { CONTENT_REGISTRY } from '@/constants/content-registry.constants';
import { AdEligibility, ContentLifecycleStatus, Indexability } from '@/enums';
import type { Locale } from '@/enums/locale.enum';
import type {
  ContentRegistryEntry,
  LocalizedContentRegistryEntry,
} from '@/types/content-registry.types';
import { localisePath } from '@/utilities/locale.utility';

// Defense in depth: a PLANNED entry is always treated as non-indexable and
// ad-ineligible regardless of what its own fields say, so a data-entry
// mistake on a not-yet-reviewed page can never make it indexable or
// ad-eligible by accident.
function isEffectivelyIndexable(entry: ContentRegistryEntry): boolean {
  return (
    entry.status === ContentLifecycleStatus.PUBLISHED &&
    entry.indexability === Indexability.INDEXABLE
  );
}

function isEffectivelyAdEligible(entry: ContentRegistryEntry): boolean {
  return (
    entry.status === ContentLifecycleStatus.PUBLISHED &&
    entry.adEligibility === AdEligibility.ELIGIBLE
  );
}

export function getPublishedPages(): ContentRegistryEntry[] {
  return CONTENT_REGISTRY.filter((entry) => entry.status === ContentLifecycleStatus.PUBLISHED);
}

export function getIndexablePages(): ContentRegistryEntry[] {
  return CONTENT_REGISTRY.filter((entry) => isEffectivelyIndexable(entry));
}

export function getAdEligiblePages(): ContentRegistryEntry[] {
  return CONTENT_REGISTRY.filter((entry) => isEffectivelyAdEligible(entry));
}

export function getPageBySlug(slug: string): ContentRegistryEntry | undefined {
  return CONTENT_REGISTRY.find((entry) => entry.slug === slug);
}

export function isKnownPublicPath(pathname: string): boolean {
  return getIndexablePages().some((entry) => entry.canonicalPath === pathname);
}

export function isAdEligiblePath(pathname: string): boolean {
  return getAdEligiblePages().some((entry) => entry.canonicalPath === pathname);
}

export function getIndexablePagesForLocale(locale: Locale): LocalizedContentRegistryEntry[] {
  return getIndexablePages()
    .filter((entry) => entry.locale === locale)
    .map((entry) => ({
      ...entry,
      path: entry.canonicalPath,
      canonicalPath: localisePath(entry.canonicalPath, locale),
      metadata: {
        title: entry.title,
        description: entry.description,
        lastReviewed: entry.lastReviewed,
      },
    }));
}

export function getLanguageAlternates(slug: string): Partial<Record<Locale, string>> {
  return Object.fromEntries(
    getIndexablePages()
      .filter((entry) => entry.slug === slug)
      .map((entry) => [entry.locale, localisePath(entry.canonicalPath, entry.locale)]),
  );
}
