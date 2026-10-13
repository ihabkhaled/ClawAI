/**
 * Why a provider stream was aborted by this process.
 *
 * `httpStream` aborts its fetch for three different reasons that used to be
 * indistinguishable (a bare `AbortError` each): the provider went silent, the
 * call ran past its absolute ceiling, or the caller cancelled. These are the
 * first two, carried as the abort reason so a catch block can tell them apart
 * without comparing messages.
 */
export class StreamIdleTimeoutError extends Error {
  public readonly idleMs: number;

  constructor(idleMs: number) {
    super(`Provider stream was silent for ${String(idleMs)}ms`);
    this.name = 'StreamIdleTimeoutError';
    this.idleMs = idleMs;
  }
}

export class StreamCeilingError extends Error {
  public readonly ceilingMs: number;

  constructor(ceilingMs: number) {
    super(`Provider stream exceeded its ${String(ceilingMs)}ms ceiling`);
    this.name = 'StreamCeilingError';
    this.ceilingMs = ceilingMs;
  }
}
