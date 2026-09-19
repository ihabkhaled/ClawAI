import type { AssembledContext } from './context.types';

/** The fields fitting reads; research evidence items satisfy it. */
export type FittableEvidence = {
  title: string | null;
  url: string;
  snippet: string;
};

export type EvidenceFitResult<T> = {
  items: T[];
  /** Items read but left out to fit the model's context. */
  omitted: number;
};

export type TextBudgetResult = {
  /** The kept texts, in order, shortened where needed. */
  texts: string[];
  /** How many from the tail were left out entirely. */
  dropped: number;
};

/** The fetched sources fitFixedContext trims in place. */
export type FixedContextSources = Pick<AssembledContext, 'memories' | 'contextPackItems'>;
