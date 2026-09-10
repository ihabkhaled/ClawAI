/**
 * What the client currently believes about its event stream.
 *
 * Surfaced to the user, not just logged. A dead stream used to be completely
 * silent: the answer simply never arrived, and nothing on the page distinguished
 * "still thinking" from "the connection died four minutes ago".
 */
export enum SseConnectionHealth {
  /** Connected, and events (or heartbeats) are arriving. */
  LIVE = 'LIVE',
  /** The connection dropped or went silent; a reconnect is in progress. */
  RECONNECTING = 'RECONNECTING',
  /** Reconnect attempts are exhausted. Nothing further will arrive on their own. */
  LOST = 'LOST',
}
