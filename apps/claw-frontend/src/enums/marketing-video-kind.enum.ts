/** How a marketing video is delivered. */
export enum MarketingVideoKind {
  /** An mp4 served from our own `public/` folder. */
  LOCAL = 'local',
  /** A YouTube Short behind a click-to-load facade. */
  SHORT = 'short',
}
