import type { NamedModelCapability } from '../../../common/enums/named-model-capability.enum';

/** One model the catalog holds and the AUTO router could answer with. */
export interface NamedModelCandidate {
  provider: string;
  providerModelId: string;
  /** ACTIVE (proven) deployments win a tie against ones awaiting validation. */
  isActive: boolean;
}

/**
 * A marketing or family name for models the catalog holds under technical ids
 * ("nano banana" is Gemini's image model). It is resolved AGAINST the catalog:
 * a name whose provider has no matching model routes nowhere.
 */
export interface NamedModelAlias {
  phrases: readonly string[];
  provider: string;
  /** Selects the provider's models this name means; absent = the whole provider. */
  modelPattern?: RegExp;
}

/** The model a prompt asked for, before the catalog picks a concrete model. */
export interface NamedModelMatch {
  /** The normalised phrase the user wrote. */
  phrase: string;
  provider: string;
  /** Set when the phrase names one catalog model; null for a provider-level name ("grok"). */
  model: string | null;
  /** The alias's own pattern, kept so a provider-level name can narrow by capability. */
  modelPattern: RegExp | null;
}

/** A named model resolved to something routing can execute. */
export interface NamedModelResolution {
  provider: string;
  model: string;
  capability: NamedModelCapability;
  phrase: string;
}

/** One name a person may write, and what it points at. */
export interface NamedModelPhraseEntry {
  phrase: string;
  provider: string;
  model: string | null;
  modelPattern: RegExp | null;
}
