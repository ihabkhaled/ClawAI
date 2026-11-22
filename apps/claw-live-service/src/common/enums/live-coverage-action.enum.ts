/** What a heartbeat does to the session's current coverage interval. */
export enum LiveCoverageAction {
  /** Playback continued without a jump: extend the current interval. */
  EXTEND = 'EXTEND',
  /** First interval, or playback jumped (seek, Live Edge return): close it and open a new one. */
  OPEN = 'OPEN',
}
