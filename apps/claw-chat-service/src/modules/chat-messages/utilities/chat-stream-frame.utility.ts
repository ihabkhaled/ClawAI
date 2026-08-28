import type { StreamEvent } from '../types/stream.types';

/**
 * Decodes one frame from the Redis fan-out channel.
 *
 * Returns null instead of throwing, because this runs inside the Redis
 * subscriber callback. An exception escaping there takes down the subscription
 * for the whole replica, which would leave every SSE connection it is serving
 * open and permanently silent — a failure indistinguishable, from the reader's
 * side, from a model that stopped answering. One bad frame is worth dropping;
 * every future frame is not.
 */
export function parseStreamFrame(payload: string): StreamEvent | null {
  try {
    return JSON.parse(payload) as StreamEvent;
  } catch {
    return null;
  }
}

/** The message from an unknown thrown value, for a log line. */
export function describeStreamError(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
