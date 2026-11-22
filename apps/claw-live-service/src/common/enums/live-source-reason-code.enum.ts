/** Why a resolved source behaves the way it does (shown to the viewer as an honest state). */
export enum LiveSourceReasonCode {
  /** Legacy (batch 1): YouTube was player only. Kept so stored/old clients still parse. */
  YOUTUBE_ANALYSIS_NOT_PERMITTED = 'YOUTUBE_ANALYSIS_NOT_PERMITTED',
  /** The viewer can analyse the stream by sharing their own tab audio. */
  BROWSER_CAPTURE_AVAILABLE = 'BROWSER_CAPTURE_AVAILABLE',
  /** The platform has no embeddable player: watch it on the platform. */
  LINK_ONLY_PLATFORM = 'LINK_ONLY_PLATFORM',
}
