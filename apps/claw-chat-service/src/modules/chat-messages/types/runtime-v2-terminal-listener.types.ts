/** How a Runtime V2 run left the active state, as its terminal listeners see it. */
export type RuntimeV2TerminalOutcome = 'completed' | 'failed' | 'paused' | 'cancelled';

/** The run a terminal listener is told about. Identifiers only — never content. */
export interface RuntimeV2TerminalNotice {
  readonly ownerId: string;
  readonly threadId: string;
  readonly runId: string;
  readonly status: RuntimeV2TerminalOutcome;
}

/**
 * Called after a run's terminal (or cancel) mutation has landed in Redis.
 * Fire-and-forget: a listener must never throw and must never delay the run.
 */
export type RuntimeV2TerminalListener = (notice: RuntimeV2TerminalNotice) => Promise<void>;
