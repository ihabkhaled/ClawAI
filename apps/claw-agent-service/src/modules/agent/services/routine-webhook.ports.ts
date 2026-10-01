/**
 * Enforces "one accepted delivery per routine per window". Abstract so the
 * service is tested against memory rather than Redis.
 */
export abstract class RoutineWebhookRateStore {
  /** Atomically takes the routine's window. False when it is already held. */
  abstract claim(key: string): Promise<boolean>;
  /** Frees the window, used when the fire failed and the sender should retry. */
  abstract release(key: string): Promise<void>;
}
