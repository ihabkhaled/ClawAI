import type { FeatureCapability } from '@/enums/feature-capability.enum';
import type { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';

export type FeatureCapabilitySection = {
  id: string;
  heading: string;
  paragraphs: readonly [string, ...string[]];
};

export type FeatureCapabilityFaqEntry = {
  question: string;
  answer: string;
};

/**
 * Everything one `/features/<capability>` page renders, in one locale. SEO
 * copy lives here beside body copy — see ADR-084 and
 * `public-page-seo-registry.constants.ts`.
 */
export type FeatureCapabilityContent = {
  seo: PublicPageSeoCopy;
  eyebrow: string;
  title: string;
  summary: string;
  sections: readonly [FeatureCapabilitySection, ...FeatureCapabilitySection[]];
  faq: readonly [FeatureCapabilityFaqEntry, ...FeatureCapabilityFaqEntry[]];
  /**
   * The ClawAI feature, routing mode or connector set this page documents, in
   * one sentence, above the CTA. Always in the same place across the cluster
   * so the set is reviewable.
   */
  productNote: string;
};

/**
 * The hub's own SEO copy is NOT here — the existing `features` registry entry
 * already owns it (F4: same URL, no redirect, no lost equity), so duplicating
 * it here would create a second source of truth. Only the new capability-card
 * copy this cluster adds to the hub lives here.
 */
export type FeaturesHubContent = {
  capabilitiesHeading: string;
  capabilitiesIntro: string;
  cardSummaries: Readonly<Record<FeatureCapability, string>>;
};

/** The six capability pages that predate the 2026-09 flagship pages. */
export type FeatureFoundationCapability =
  | FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION
  | FeatureCapability.MEMORY_AND_CONTEXT
  | FeatureCapability.WORKSPACE_CONNECTORS
  | FeatureCapability.FILE_AND_DOCUMENT_HANDLING
  | FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY
  | FeatureCapability.SECURITY_AND_DATA_HANDLING;

/** The flagship pages added by the full-AI-workspace repositioning. */
export type FeatureFlagshipCapability = Exclude<FeatureCapability, FeatureFoundationCapability>;

/**
 * One locale's copy for the flagship pages. Kept in its own module per locale
 * (`features-flagship-content/<locale>.constants.ts`) and merged into the
 * cluster dictionary, so the original six pages' files stay untouched.
 * `capabilitiesIntro` replaces the hub intro, which used to count six pages.
 */
export type FeaturesFlagshipDictionary = {
  capabilitiesIntro: string;
  cardSummaries: Readonly<Record<FeatureFlagshipCapability, string>>;
  capabilities: Readonly<Record<FeatureFlagshipCapability, FeatureCapabilityContent>>;
};

/** A locale's original six-page dictionary, before the flagship merge. */
export type FeaturesClusterFoundationDictionary = {
  labels: FeaturesClusterDictionary['labels'];
  hub: {
    capabilitiesHeading: string;
    capabilitiesIntro: string;
    cardSummaries: Readonly<Record<FeatureFoundationCapability, string>>;
  };
  capabilities: Readonly<Record<FeatureFoundationCapability, FeatureCapabilityContent>>;
};

export type FeaturesClusterDictionary = {
  labels: {
    onThisPage: string;
    faqTitle: string;
    relatedTitle: string;
    lastReviewed: string;
    backToHub: string;
    ctaTitle: string;
    ctaBody: string;
    startFree: string;
    seeUseCases: string;
  };
  hub: FeaturesHubContent;
  capabilities: Readonly<Record<FeatureCapability, FeatureCapabilityContent>>;
};

export type FeaturesClusterContentByLocale = Readonly<Record<Locale, FeaturesClusterDictionary>>;

export type FeatureCapabilityCard = {
  capability: FeatureCapability;
  title: string;
  summary: string;
  href: string;
};

export type FeatureRelatedLink = {
  path: string;
  href: string;
};

export type FeatureCapabilitySiblingLink = {
  capability: FeatureCapability;
  title: string;
  href: string;
};
