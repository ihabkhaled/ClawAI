import type { CreditFallbackReason } from '../enums/credit-fallback-reason.enum';

/** The credit model the user wanted and why it was not used. */
export type CreditRefusalRecord = {
  originalProvider: string;
  originalModel: string;
  reason: CreditFallbackReason;
};

/**
 * Persisted as `metadata.creditFallback` when an included model answered because
 * the credit model was refused: the bubble tells the user their credit was not
 * touched and which model answered.
 */
export type CreditFallbackNotice = CreditRefusalRecord;
