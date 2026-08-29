import type { PaygHold } from '@claw/shared-entitlements';
import type { PaygSurface } from '@claw/shared-types';

/**
 * How one provider call identifies itself to the PAYG meter.
 *
 * Every field is optional because the chokepoint can derive a correct default
 * from the `TokenLedgerContext` the caller already passes — a surface that is
 * never named still gets metered, which is the whole point. Naming one is how a
 * caller says something the ledger context cannot: the coding agent and the
 * vision-prompt hop both run as `TokenLedgerContext.CHAT`.
 */
export type PaygCallOptions = {
  /** Overrides the surface derived from the token-ledger context. */
  surface?: PaygSurface;
  /** Narrows the surface — the orchestration mode, the lane, the loop turn. */
  workflow?: string;
  /**
   * Idempotency key for the hold. Must be stable across retries of the SAME
   * logical call and distinct between different calls: a compare run needs one
   * per lane and a tool loop one per turn, or N paid turns bill as one.
   * Generated per call when absent.
   */
  requestId?: string;
  /** Thread to notify when the answer was shortened to fit the balance. */
  threadId?: string;
  /**
   * A hold taken by the caller instead of by the chokepoint.
   *
   * Compare reserves every lane up front so a run that cannot be paid for in
   * full is refused before any provider is called. The chokepoint still owns
   * settling it — finalize on success, release on a throw.
   */
  hold?: PaygHold;
};

/** What a metered call reports back about its hold. */
export type PaygCallOutcome = {
  hold: PaygHold;
  /** True when the ceiling sent to the provider was reduced to fit the balance. */
  clamped: boolean;
};

/**
 * One orchestration-mode provider call, as the meter needs to see it.
 *
 * The orchestration labs POST straight to ollama-service rather than going
 * through the chat chokepoint, so each of them has to describe its own call.
 * They are wrapped even though local Ollama costs nothing today: the meter
 * short-circuits an exempt provider for free, and the alternative - "these ones
 * are free so skip the wrapper" - is a rule that silently stops being true the
 * day a lab is pointed at a cloud model.
 */
export type PaygOrchestrationCall = {
  userId: string;
  requestId: string;
  provider: string;
  model: string;
  workflow: string;
  promptText: string;
  /**
   * Absent means "no explicit cap was asked for", and the meter then reserves
   * against the same defensive default the request builders apply. Zero would
   * be a different claim entirely - that the caller wanted no output at all.
   */
  requestedMaxOutputTokens?: number;
};

/** What one orchestration call actually used, read off the provider's own reply. */
export type PaygOrchestrationUsage = {
  promptTokens: number;
  completionTokens: number;
};
