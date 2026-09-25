import type { BlockSignalKind } from '../../../common/enums/block-signal-kind.enum';
import type { FetchStrategyAttempt } from '../types/fetch-strategy.types';

/**
 * Every eligible strategy was tried (or the chain was stopped by a refusal,
 * the attempt ceiling, or the wall-clock budget) and none produced a page.
 * Carries the full trail so the caller can report WHY, not just "failed".
 */
export class FetchEscalationError extends Error {
  constructor(
    message: string,
    readonly attempts: readonly FetchStrategyAttempt[],
    readonly signals: readonly BlockSignalKind[],
  ) {
    super(message);
    this.name = 'FetchEscalationError';
  }
}
