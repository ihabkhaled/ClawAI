import { API_BASE_URL } from '@/constants/api.constants';
import { LIVE_API, LIVE_JSON_MIME_TYPE } from '@/constants/live.constants';
import { LiveHeartbeatState } from '@/enums/live.enum';
import type { LiveHeartbeatInput, LivePlaybackSnapshot, LiveSession } from '@/types/live.types';

import { isBehindLiveEdge } from './live-reveal.utility';

/**
 * Tab closed or navigated away: a normal DELETE may never leave the page, so the session is closed
 * with a beacon carrying the one-time close token from session creation (no bearer header needed).
 */
export function sendLiveCloseBeacon(session: LiveSession): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false;
  }
  // The server's beacon reader takes `{ token }` (or the bare token as text/plain).
  const body = new Blob([JSON.stringify({ token: session.closeToken })], {
    type: LIVE_JSON_MIME_TYPE,
  });
  return navigator.sendBeacon(`${API_BASE_URL}${LIVE_API.CLOSE_BEACON(session.sessionId)}`, body);
}

/** The heartbeat body for where playback is now; null before the first frame. */
export function toLiveHeartbeatInput(snapshot: LivePlaybackSnapshot): LiveHeartbeatInput | null {
  if (snapshot.playbackAt <= 0) {
    return null;
  }
  return {
    state: snapshot.isPaused ? LiveHeartbeatState.PAUSED : LiveHeartbeatState.PLAYING,
    playbackAt: Math.round(snapshot.playbackAt),
    atLiveEdge: !isBehindLiveEdge(snapshot.playbackAt, snapshot.liveEdgeAt),
    ...(snapshot.seekable === null ? {} : { seekableFromAt: Math.round(snapshot.seekable.fromAt) }),
  };
}

/** The same-origin proxy playlist URL the player loads. */
export function liveHlsUrl(streamId: string): string {
  return `${API_BASE_URL}${LIVE_API.HLS_PLAYLIST(streamId)}`;
}

export function liveStreamUrl(sessionId: string): string {
  return `${API_BASE_URL}${LIVE_API.STREAM(sessionId)}`;
}
