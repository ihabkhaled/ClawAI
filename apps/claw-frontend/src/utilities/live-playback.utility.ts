import { LIVE_DEFAULT_LATENCY_MS, LIVE_MS_PER_SECOND } from '@/constants/live.constants';
import type {
  LiveHlsPlayerHandle,
  LivePlaybackSnapshot,
  LiveVideoWithStartDate,
} from '@/types/live.types';

function nativeProgramDateMs(video: LiveVideoWithStartDate): number | null {
  const start = video.getStartDate?.().getTime();
  return start === undefined || !Number.isFinite(start)
    ? null
    : start + video.currentTime * LIVE_MS_PER_SECOND;
}

/**
 * Offset between the video element's timeline (seconds) and media wall-clock time (epoch ms).
 * Uses the program date when the stream carries one (`hls.playingDate`, Safari `getStartDate`);
 * otherwise assumes the live edge is `now - latency` (section 5).
 */
export function liveMediaOffsetMs(
  video: LiveVideoWithStartDate,
  handle: LiveHlsPlayerHandle | null,
  nowMs: number,
): number {
  const currentMs = video.currentTime * LIVE_MS_PER_SECOND;
  const dateMs = handle?.getPlayingDateMs() ?? nativeProgramDateMs(video);
  if (dateMs !== null) {
    return dateMs - currentMs;
  }
  const seekable = video.seekable;
  const edgeSeconds =
    handle?.getLiveSyncPosition() ??
    (seekable.length > 0 ? seekable.end(seekable.length - 1) : video.currentTime);
  const latencyMs = handle?.getLatencyMs() ?? LIVE_DEFAULT_LATENCY_MS;
  return nowMs - latencyMs - edgeSeconds * LIVE_MS_PER_SECOND;
}

export function readLivePlayback(
  video: LiveVideoWithStartDate,
  handle: LiveHlsPlayerHandle | null,
  nowMs: number,
): LivePlaybackSnapshot {
  const offset = liveMediaOffsetMs(video, handle, nowMs);
  const seekable = video.seekable;
  const range =
    seekable.length > 0
      ? {
          fromAt: offset + seekable.start(0) * LIVE_MS_PER_SECOND,
          toAt: offset + seekable.end(seekable.length - 1) * LIVE_MS_PER_SECOND,
        }
      : null;
  const syncSeconds = handle?.getLiveSyncPosition() ?? null;
  return {
    playbackAt: offset + video.currentTime * LIVE_MS_PER_SECOND,
    isPaused: video.paused,
    seekable: range,
    liveEdgeAt:
      syncSeconds === null ? (range?.toAt ?? null) : offset + syncSeconds * LIVE_MS_PER_SECOND,
  };
}

/** The `currentTime` that shows media time `mediaAt`, given where playback is now. */
export function liveMediaToVideoTime(
  mediaAt: number,
  snapshot: LivePlaybackSnapshot,
  currentTime: number,
): number {
  return Math.max(0, currentTime + (mediaAt - snapshot.playbackAt) / LIVE_MS_PER_SECOND);
}
