import type { NamedModelNoticePayload } from '@claw/shared-types';
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

/** A model the catalog holds, with what decides whether this user can be routed to it. */
export interface NamedModelCatalogEntry extends NamedModelCandidate {
  /** The user's plan includes this model. */
  allowed: boolean;
  /** Its connector is not known to be down. */
  healthy: boolean;
}

/**
 * What a prompt that names a model came to: the model that will answer (with
 * the request minus the directive words), or the reason it cannot, which the
 * answer must tell the user instead of silently using another model.
 */
export interface NamedModelOutcome {
  resolution: NamedModelResolution | null;
  /** The request without "use X to" — only when a model was resolved and the words changed. */
  prompt: string | null;
  notice: NamedModelNoticePayload | null;
}

/**
 * Written by the named-model step so the notice can reach the final decision
 * even when the step falls through to normal routing.
 */
export interface NamedModelSlot {
  notice?: NamedModelNoticePayload;
}
