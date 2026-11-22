/** Machine codes the sources/processing modules return in 4xx/5xx bodies (rule 18). Never provider text. */
export enum LiveSourceErrorCode {
  SOURCE_UNSUPPORTED = 'LIVE_SOURCE_UNSUPPORTED',
  SOURCE_UNSAFE = 'LIVE_SOURCE_UNSAFE',
  /** A YouTube @handle or vanity link: paste the stream's video link or the /channel/UC… link. */
  YOUTUBE_HANDLE_UNSUPPORTED = 'LIVE_YOUTUBE_HANDLE_UNSUPPORTED',
  SOURCE_PLAYER_ONLY = 'LIVE_SOURCE_PLAYER_ONLY',
  /** Discord Go Live streams inside a voice channel and has no public link to watch or analyse. */
  DISCORD_PRIVATE = 'LIVE_DISCORD_PRIVATE',
  STREAM_NOT_FOUND = 'LIVE_STREAM_NOT_FOUND',
  UPSTREAM_FAILED = 'LIVE_UPSTREAM_FAILED',
  UPSTREAM_TOO_LARGE = 'LIVE_UPSTREAM_TOO_LARGE',
  UPSTREAM_CONTENT_TYPE = 'LIVE_UPSTREAM_CONTENT_TYPE',
  FIXTURE_UNAVAILABLE = 'LIVE_FIXTURE_UNAVAILABLE',
}
