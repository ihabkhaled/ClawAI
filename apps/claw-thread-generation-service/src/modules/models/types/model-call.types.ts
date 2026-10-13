export type ModelCallAbortCause = 'idle' | 'ceiling' | 'cancelled';

export type ModelCallGuardOptions = {
  /** Silence limit; reset by `touch()`. */
  idleMs: number;
  /** Absolute limit from creation; never reset. */
  maxMs: number;
  /** The job's cancellation signal (cancel, lease loss, attempt ceiling). */
  cancelSignal?: AbortSignal;
};

export type ModelCallGuard = {
  /** Aborts on idle expiry, the ceiling or the cancellation signal. */
  signal: AbortSignal;
  /** Bytes arrived: restart the silence timer. */
  touch: () => void;
  /** Stops watching for silence (a buffered fallback call has no activity to watch). */
  disableIdle: () => void;
  /** Why the signal aborted, or null while it has not. */
  cause: () => ModelCallAbortCause | null;
  dispose: () => void;
};

export type NdjsonReadOptions = {
  /** Called for every chunk of bytes, including a partial line. */
  onBytes: () => void;
  /** Aborting cancels the underlying reader so a pending read ends at once. */
  signal: AbortSignal;
};
