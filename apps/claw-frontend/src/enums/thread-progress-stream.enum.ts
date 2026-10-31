/** How the owner's Thread progress reaches the page (ADR-201). */
export enum ThreadProgressStreamMode {
  /** Being opened or re-opened; the page polls meanwhile. */
  Connecting = 'connecting',
  /** Pushes are arriving; polling is off. */
  Live = 'live',
  /** The stream is unavailable; the page polls as it always did. */
  Fallback = 'fallback',
}

/** The `type` of one message on the progress stream. */
export enum ThreadProgressStreamMessageType {
  Progress = 'progress',
  Terminal = 'terminal',
  Heartbeat = 'heartbeat',
  Reconnect = 'reconnect',
  Gone = 'gone',
  Error = 'error',
}
