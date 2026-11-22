/** A fenced write found the lease taken over, the run stopped or tombstoned: the worker must exit. */
export class LeaseLostError extends Error {
  constructor() {
    super('LIVE_LEASE_LOST');
    this.name = 'LeaseLostError';
  }
}

/** A platform-paid model call produced nothing usable. A code, never provider text. */
export class LiveModelError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'LiveModelError';
  }
}
