/** The anonymous playback token Twitch issues to its own web player. */
export interface TwitchPlaybackToken {
  value: string;
  signature: string;
}

/** A pulled stream's playlist and the host suffixes its playlists and segments are served from. */
export interface ResolvedPull {
  playlist: URL;
  hostSuffixes: readonly string[];
}
