/** Why a resolved source behaves the way it does (shown to the viewer as an honest state). */
export enum LiveSourceReasonCode {
  /** Legacy (batch 1): YouTube was player only. Kept so stored/old clients still parse. */
  YOUTUBE_ANALYSIS_NOT_PERMITTED = 'YOUTUBE_ANALYSIS_NOT_PERMITTED',
  /** The viewer can analyse the stream by sharing their own tab audio. */
  BROWSER_CAPTURE_AVAILABLE = 'BROWSER_CAPTURE_AVAILABLE',
  /** The platform has no embeddable player: watch it on the platform. */
  LINK_ONLY_PLATFORM = 'LINK_ONLY_PLATFORM',
  /** ClawAI's server reads the stream itself: one shared run, works on any device. */
  SERVER_PULL_AVAILABLE = 'SERVER_PULL_AVAILABLE',
  /** Server pull is on for the platform but the stream could not be read (offline, refused): browser capture instead. */
  SERVER_PULL_UNAVAILABLE = 'SERVER_PULL_UNAVAILABLE',
  /** A recorded video: ClawAI's server plays it along from the start (private to the viewer). */
  RECORDED_VIDEO = 'RECORDED_VIDEO',
}
