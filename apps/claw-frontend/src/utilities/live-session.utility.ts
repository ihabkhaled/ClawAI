import { API_BASE_URL } from '@/constants/api.constants';
import {
  LIVE_API,
  LIVE_JSON_MIME_TYPE,
  LIVE_RECORDED_STATUS_PRESENTATION,
  LIVE_STATUS_PRESENTATION,
  LIVE_SUMMARY_STATUS_PRESENTATION,
} from '@/constants/live.constants';
import {
  LiveCapability,
  LiveHeartbeatState,
  LiveSourceKind,
  type LiveStatusCode,
} from '@/enums/live.enum';
import type {
  LiveHeartbeatInput,
  LivePlaybackSnapshot,
  LiveSession,
  LiveStatusPresentation,
} from '@/types/live.types';

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

/**
 * The heartbeat of a browser-capture session: there is no player clock, so playback is "now" and
 * always at the live edge. PLAYING while the tab audio is being shared, PAUSED otherwise.
 */
export function toLiveCaptureHeartbeatInput(isCapturing: boolean, now: number): LiveHeartbeatInput {
  return {
    state: isCapturing ? LiveHeartbeatState.PLAYING : LiveHeartbeatState.PAUSED,
    playbackAt: Math.round(now),
    atLiveEdge: true,
  };
}

/** Only an HLS (or fixture) source plays through the proxy; YouTube and platform sources are iframes. */
export function liveSessionHlsSrc(
  session: Pick<LiveSession, 'sourceKind' | 'streamId'> | null,
): string | null {
  if (
    session === null ||
    (session.sourceKind !== LiveSourceKind.HLS && session.sourceKind !== LiveSourceKind.FIXTURE)
  ) {
    return null;
  }
  return liveHlsUrl(session.streamId);
}

/** The same-origin proxy playlist URL the player loads. */
export function liveHlsUrl(streamId: string): string {
  return `${API_BASE_URL}${LIVE_API.HLS_PLAYLIST(streamId)}`;
}

export function liveStreamUrl(sessionId: string): string {
  return `${API_BASE_URL}${LIVE_API.STREAM(sessionId)}`;
}

/** The modal's header badge: LIVE for a stream, Video for a recorded video, Summary for a one-click summary. */
export function liveModalBadgeKey(session: Pick<LiveSession, 'capability' | 'summary'>): string {
  if (session.summary === true) {
    return 'live.summary.badge';
  }
  return session.capability === LiveCapability.RECORDED
    ? 'live.modal.videoBadge'
    : 'live.modal.liveBadge';
}

/** The status wording for a session: a summary and a recorded video have their own, else the stream's. */
export function liveStatusPresentation(
  status: LiveStatusCode,
  session: Pick<LiveSession, 'capability' | 'summary'> | null,
): LiveStatusPresentation {
  if (session?.summary === true) {
    return LIVE_SUMMARY_STATUS_PRESENTATION[status] ?? LIVE_STATUS_PRESENTATION[status];
  }
  if (session?.capability === LiveCapability.RECORDED) {
    return LIVE_RECORDED_STATUS_PRESENTATION[status] ?? LIVE_STATUS_PRESENTATION[status];
  }
  return LIVE_STATUS_PRESENTATION[status];
}
