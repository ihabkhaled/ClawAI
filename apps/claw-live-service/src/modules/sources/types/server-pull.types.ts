import type { ServerPullProbe } from '../../../common/enums/live-server-pull-probe.enum';
/** The anonymous playback token Twitch issues to its own web player. */
export interface TwitchPlaybackToken {
  value: string;
  signature: string;
}

/** A pulled stream's playlist and the host suffixes its playlists and segments are served from. */
export interface ResolvedPull {
  playlist: URL;
  hostSuffixes: readonly string[];
  /** The platform's id of the live video (yt-dlp `%(id)s`), when it reported one. */
  videoId: string | null;
}

/** What the resolve-time probe learned: whether the server reads the stream, and its video id. */
export interface ServerPullOutcome {
  probe: ServerPullProbe;
  videoId: string | null;
  /** RECORDED only: the video's length when the site reports it. */
  durationSeconds?: number | null;
}

/** What the recorded-video probe learned: the length (null when the site hides it) and the video id. */
export interface RecordedProbe {
  durationSeconds: number | null;
  videoId: string | null;
}
