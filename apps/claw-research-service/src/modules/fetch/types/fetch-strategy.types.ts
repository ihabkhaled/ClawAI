import type { FetchStrategyConfig, FetchStrategyKind } from '../../../generated/prisma';
import type { BlockSignalKind } from '../../../common/enums/block-signal-kind.enum';
import type { FetchResult } from './fetch.types';

/** One row's worth of strategy configuration, as read by the orchestrator. */
export type FetchStrategyConfigSnapshot = {
  kind: FetchStrategyKind;
  enabled: boolean;
  tier: number;
  timeoutMs: number;
  publicConfig: Record<string, unknown>;
};

/** Outcome of one strategy attempt inside the escalation chain. */
export type FetchStrategyAttempt = {
  kind: FetchStrategyKind;
  outcome: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  blockSignal: BlockSignalKind;
  errorMessage?: string;
  durationMs: number;
};

/** Final result of an escalation run: the winning fetch plus the full trail. */
export type FetchEscalationResult = {
  result: FetchResult;
  winningStrategy: FetchStrategyKind;
  attempts: readonly FetchStrategyAttempt[];
};

/** Internal: one strategy's raw attempt record paired with its (possibly empty) result. */
export type StrategyAttemptOutcome = {
  record: FetchStrategyAttempt;
  result: FetchResult;
};

/** A live 2xx result that came back thin, kept in case every renderer does too. */
export type ThinCandidate = {
  config: FetchStrategyConfig;
  result: FetchResult;
};

/** How a caller shapes one escalation run. */
export type EscalationOptions = {
  /**
   * Signals already known before any strategy runs — e.g. NOT_FOUND-style
   * "origin off-limits" when robots.txt was unreachable, so only the
   * off-origin archive may run.
   */
  initialSignals?: readonly BlockSignalKind[];
  /** robots.txt `Crawl-delay` for this host, in ms, when longer than the default gap. */
  minHostIntervalMs?: number | null;
  /** Strategies this call must not use (an operator kill switch, for example). */
  excludeKinds?: readonly FetchStrategyKind[];
};
