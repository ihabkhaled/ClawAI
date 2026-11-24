/** Outcome of the resolve-time server-pull check for a browser-capture platform. */
export enum ServerPullProbe {
  /** Policy off for the platform, or no resolver: browser capture, no network call made. */
  NOT_ENABLED = 'NOT_ENABLED',
  /** The live playlist answered: SERVER_PULL. */
  LIVE = 'LIVE',
  /** Enabled but the stream could not be read (offline, refused, blocked): browser capture. */
  UNREACHABLE = 'UNREACHABLE',
  /** Not live, but a recorded video the server can download and play along (RECORDED). */
  RECORDED = 'RECORDED',
}
