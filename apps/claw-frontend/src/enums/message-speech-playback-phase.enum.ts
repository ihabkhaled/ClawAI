/**
 * What the progressive read-aloud player is doing right now — drives its
 * aria-live status line and its controls.
 */
export enum MessageSpeechPlaybackPhase {
  /** No segment has arrived yet ("Preparing audio…"). */
  PREPARING = 'PREPARING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  /** The current part finished and the next is still being synthesised. */
  WAITING = 'WAITING',
  /** Every part that exists has been played. */
  FINISHED = 'FINISHED',
  /** Nothing can be played: the job failed, or its audio could not be loaded. */
  FAILED = 'FAILED',
  /** The reading was stopped before any part was ready ("Reading stopped."). */
  CANCELLED = 'CANCELLED',
}
