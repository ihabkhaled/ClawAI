import type { BoundedProcessResult } from '../../../common/utilities/process.types';
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
  /** Allow-listed request headers the CDN expects (yt-dlp's); {} for Twitch. */
  headers: Readonly<Record<string, string>>;
}

/** One parsed yt-dlp stream line: the playlist, the video id and the headers to send with it. */
export interface YtdlpStreamLine {
  url: URL;
  videoId: string | null;
  headers: Readonly<Record<string, string>>;
}

/** What the resolve-time probe learned: whether the server reads the stream, and its video id. */
export interface ServerPullOutcome {
  probe: ServerPullProbe;
  videoId: string | null;
  /** RECORDED only: the video's length when the site reports it. */
  durationSeconds?: number | null;
  /** RECORDED only: the frame is taller than wide (null when the site does not say). */
  portrait?: boolean | null;
}

/** One yt-dlp job: fixed argv (without the URL), the canonical watch URL, and what counts as success. */
export interface YtdlpRun {
  args: readonly string[];
  watchUrl: string;
  timeoutMs: number;
  accept: (result: BoundedProcessResult) => boolean;
}

/** What the recorded-video probe learned: the length (null when the site hides it) and the video id. */
export interface RecordedProbe {
  durationSeconds: number | null;
  videoId: string | null;
  /** True/false when the site reports the frame size; null when it does not. */
  portrait: boolean | null;
}
