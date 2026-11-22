import { useCallback, useEffect, useRef, useState } from 'react';

import { LIVE_EMPTY_PLAYBACK } from '@/constants/live.constants';
import { useLivePlayerAttach } from '@/hooks/live/use-live-player-attach';
import type {
  LivePlaybackSnapshot,
  UseLivePlayerOptions,
  UseLivePlayerResult,
} from '@/types/live.types';
import { liveMediaToVideoTime, readLivePlayback } from '@/utilities/live-playback.utility';
import { isWithinSeekable } from '@/utilities/live-reveal.utility';

/**
 * The HLS player and its media clock. `snapshot.playbackAt` is re-read on every `timeupdate`, so the
 * revealed feed follows playback; play, pause and seek also fire `onPlaybackChange` (immediate heartbeat).
 */
export function useLivePlayer({
  hlsSrc,
  onPlaybackChange,
}: UseLivePlayerOptions): UseLivePlayerResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const changeRef = useRef(onPlaybackChange);
  const { handleRef, hasError } = useLivePlayerAttach(videoRef, hlsSrc);
  const [snapshot, setSnapshot] = useState<LivePlaybackSnapshot>(LIVE_EMPTY_PLAYBACK);

  useEffect(() => {
    changeRef.current = onPlaybackChange;
  }, [onPlaybackChange]);
  const readSnapshot = useCallback((): LivePlaybackSnapshot => {
    const video = videoRef.current;
    return video === null
      ? LIVE_EMPTY_PLAYBACK
      : readLivePlayback(video, handleRef.current, Date.now());
  }, [handleRef]);
  useEffect(() => {
    const video = videoRef.current;
    if (video === null || hlsSrc === null) {
      return undefined;
    }
    const onTime = (): void => setSnapshot(readSnapshot());
    const onChange = (): void => {
      setSnapshot(readSnapshot());
      changeRef.current();
    };
    video.addEventListener('timeupdate', onTime);
    for (const name of ['play', 'pause', 'seeked'] as const) {
      video.addEventListener(name, onChange);
    }
    return (): void => {
      video.removeEventListener('timeupdate', onTime);
      for (const name of ['play', 'pause', 'seeked'] as const) {
        video.removeEventListener(name, onChange);
      }
    };
  }, [hlsSrc, readSnapshot]);

  const seekTo = useCallback(
    (mediaAt: number): void => {
      const video = videoRef.current;
      const current = readSnapshot();
      if (video !== null && isWithinSeekable(mediaAt, current.seekable)) {
        video.currentTime = liveMediaToVideoTime(mediaAt, current, video.currentTime);
      }
    },
    [readSnapshot],
  );
  const jumpToLive = useCallback((): void => {
    const current = readSnapshot();
    const edge = current.liveEdgeAt ?? current.seekable?.toAt;
    if (edge !== undefined && edge !== null) {
      seekTo(edge);
      videoRef.current?.play().catch(() => undefined);
    }
  }, [readSnapshot, seekTo]);

  return { videoRef, snapshot, hasPlayerError: hasError, readSnapshot, seekTo, jumpToLive };
}
