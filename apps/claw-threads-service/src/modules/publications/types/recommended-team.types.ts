import type { ModelRef } from './generation-preflight.types';

/** One picker-catalog model with what the recommended team needs to rank it. */
export type CatalogModel = ModelRef & {
  /** Context window in tokens; null when the catalog does not publish one. */
  windowTokens: number | null;
  /** Coarse cost band (LOW to EXTRA_HIGH); null when unknown. */
  usageTier: string | null;
};

export type CatalogIndex = {
  keys: ReadonlySet<string>;
  models: readonly CatalogModel[];
};

/** Whether a catalog model can be used by this caller, and if not, why. */
export enum ThreadModelAvailability {
  AVAILABLE = 'AVAILABLE',
  NEEDS_PLAN = 'NEEDS_PLAN',
  WINDOW_TOO_SMALL = 'WINDOW_TOO_SMALL',
  UNAVAILABLE = 'UNAVAILABLE',
}

export type RecommendedSeat = ModelRef & { fallbacks: ModelRef[] };

export type RecommendedTeam = {
  authors: RecommendedSeat[];
  judge: RecommendedSeat;
  critic: RecommendedSeat;
};

export type RecommendedModelStatus = ModelRef & { status: ThreadModelAvailability };

export type RecommendedTeamResponse = {
  /** The caller's plan name, for the "not on your plan" sentence. */
  planName: string;
  /** Null when no model is usable (the wizard then falls back to its own ranking). */
  team: RecommendedTeam | null;
  /** One row per catalog model: usable, or the reason it is not. */
  models: RecommendedModelStatus[];
};

/** A cached answer and the time it stops being reused. */
export type RecommendedTeamCacheEntry = { value: RecommendedTeamResponse; expiresAt: number };
