import {
  CONTENT_REGISTRY,
  PUBLIC_CONTENT_DEFINITIONS,
} from '@/constants/content-registry.constants';
import { AdEligibility, ContentLifecycleStatus, ContentReviewStatus, Indexability } from '@/enums';
import type { Locale } from '@/enums/locale.enum';
import type {
  ContentRegistryEntry,
  LocalizedContentMetadata,
  LocalizedContentRegistryEntry,
  PublicContentDefinition,
} from '@/types/content-registry.types';
import { localisePath } from '@/utilities/locale.utility';

function isEffectivelyIndexable(
  definition: PublicContentDefinition,
  metadata: LocalizedContentMetadata | undefined,
): metadata is LocalizedContentMetadata {
  return (
    definition.status === ContentLifecycleStatus.PUBLISHED &&
    metadata?.reviewStatus === ContentReviewStatus.REVIEWED &&
    metadata.indexability === Indexability.INDEXABLE
  );
}

function toRegistryEntry(
  definition: PublicContentDefinition,
  locale: Locale,
  metadata: LocalizedContentMetadata,
): ContentRegistryEntry {
  return {
    slug: definition.slug,
    locale,
    status: definition.status,
    title: metadata.title,
    description: metadata.description,
    category: definition.category,
    canonicalPath: definition.path,
    lastReviewed: metadata.lastReviewed,
    indexability: metadata.indexability,
    adEligibility: definition.adEligibility,
    reviewStatus: metadata.reviewStatus,
    relatedSlugs: definition.relatedSlugs,
    structuredDataType: definition.structuredDataType,
  };
}

function getLocalizedEntry(
  definition: PublicContentDefinition,
  locale: Locale,
): ContentRegistryEntry | undefined {
  const metadata = definition.locales[locale];
  return metadata === undefined ? undefined : toRegistryEntry(definition, locale, metadata);
}

function isEffectivelyAdEligible(entry: ContentRegistryEntry): boolean {
  return (
    entry.status === ContentLifecycleStatus.PUBLISHED &&
    entry.reviewStatus === ContentReviewStatus.REVIEWED &&
    entry.adEligibility === AdEligibility.ELIGIBLE
  );
}

export function getPublishedPages(): ContentRegistryEntry[] {
  return CONTENT_REGISTRY.filter((entry) => entry.status === ContentLifecycleStatus.PUBLISHED);
}

export function getPublishedPagesForLocale(locale: Locale): ContentRegistryEntry[] {
  return PUBLIC_CONTENT_DEFINITIONS.flatMap((definition) => {
    if (definition.status !== ContentLifecycleStatus.PUBLISHED) {
      return [];
    }
    const entry = getLocalizedEntry(definition, locale);
    return entry === undefined ? [] : [entry];
  });
}

export function getIndexablePages(): ContentRegistryEntry[] {
  return PUBLIC_CONTENT_DEFINITIONS.flatMap((definition) =>
    Object.entries(definition.locales).flatMap(([locale, metadata]) =>
      isEffectivelyIndexable(definition, metadata)
        ? [toRegistryEntry(definition, locale as Locale, metadata)]
        : [],
    ),
  );
}

export function getAdEligiblePages(): ContentRegistryEntry[] {
  return CONTENT_REGISTRY.filter((entry) => isEffectivelyAdEligible(entry));
}

export function getPageBySlug(slug: string): ContentRegistryEntry | undefined {
  return CONTENT_REGISTRY.find((entry) => entry.slug === slug);
}

export function getPageBySlugAndLocale(
  slug: string,
  locale: Locale,
): ContentRegistryEntry | undefined {
  const definition = PUBLIC_CONTENT_DEFINITIONS.find((entry) => entry.slug === slug);
  return definition === undefined ? undefined : getLocalizedEntry(definition, locale);
}

export function getLocalizedCanonicalPath(slug: string, locale: Locale): string | undefined {
  const definition = PUBLIC_CONTENT_DEFINITIONS.find((entry) => entry.slug === slug);
  const metadata = definition?.locales[locale];
  return definition !== undefined && isEffectivelyIndexable(definition, metadata)
    ? localisePath(definition.path, locale)
    : undefined;
}

export function isKnownPublicPath(pathname: string): boolean {
  return PUBLIC_CONTENT_DEFINITIONS.some(
    (definition) =>
      definition.path === pathname &&
      Object.values(definition.locales).some((metadata) =>
        isEffectivelyIndexable(definition, metadata),
      ),
  );
}

export function isKnownPublicPathForLocale(pathname: string, locale: Locale): boolean {
  return getIndexablePagesForLocale(locale).some((entry) => entry.path === pathname);
}

export function isAdEligiblePath(pathname: string): boolean {
  return getAdEligiblePages().some((entry) => entry.canonicalPath === pathname);
}

export function getIndexablePagesForLocale(locale: Locale): LocalizedContentRegistryEntry[] {
  return PUBLIC_CONTENT_DEFINITIONS.flatMap((definition) => {
    const metadata = definition.locales[locale];
    if (!isEffectivelyIndexable(definition, metadata)) {
      return [];
    }
    const entry = toRegistryEntry(definition, locale, metadata);
    return [
      {
        ...entry,
        path: definition.path,
        canonicalPath: localisePath(definition.path, locale),
        metadata: {
          title: metadata.title,
          description: metadata.description,
          lastReviewed: metadata.lastReviewed,
        },
      },
    ];
  });
}

export function getLanguageAlternates(slug: string): Partial<Record<Locale, string>> {
  const definition = PUBLIC_CONTENT_DEFINITIONS.find((entry) => entry.slug === slug);
  if (definition === undefined) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(definition.locales).flatMap(([locale, metadata]) =>
      isEffectivelyIndexable(definition, metadata)
        ? [[locale, localisePath(definition.path, locale as Locale)]]
        : [],
    ),
  );
}
