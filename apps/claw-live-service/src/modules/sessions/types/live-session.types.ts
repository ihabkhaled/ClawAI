import type { LiveStatusCode } from '../../../common/enums/live-status-code.enum';
import type {
  LiveCapability,
  LivePlatform,
  LiveRunStatus,
  LiveSessionState,
  LiveSourceKind,
} from '../../../generated/prisma';
import type { LiveUsageView } from '../../billing/types/live-billing.types';

/** The session's own billing counters, as the UI shows them. Money is integer micro-USD. */
export interface LiveSessionUsageView {
  billedSeconds: number;
  pendingSeconds: number;
  spentMicroUsd: number;
  paidApproved: boolean;
  spendingCapMicroUsd: number | null;
  month: LiveUsageView;
}

/** The platform fields every resolve and session-create answer carries (architecture section 9). */
export interface LivePlatformView {
  platform: LivePlatform | null;
  chatEmbedUrl: string | null;
  /** Canonical public page ('' for HLS/FIXTURE). */
  watchUrl: string;
  /** Twitch: the frontend appends `&parent=<hostname>` to the player and chat URLs. */
  embedNeedsParent: boolean;
  /** YouTube: the frontend appends `&embed_domain=<hostname>` to the chat URL. */
  chatNeedsEmbedDomain: boolean;
}

export interface LiveSourceResolutionView extends LivePlatformView {
  sourceKind: LiveSourceKind;
  capability: LiveCapability;
  embedUrl: string | null;
  reasonCode: string | null;
  /** A recorded video's length (the one-click summary estimate); null when unknown or live. */
  durationSeconds: number | null;
}

export interface LiveSessionCreatedView extends LivePlatformView {
  sessionId: string;
  runId: string | null;
  streamId: string;
  sourceKind: LiveSourceKind;
  capability: LiveCapability;
  embedUrl: string | null;
  playbackUrl: string | null;
  state: LiveSessionState;
  usage: LiveSessionUsageView;
  /** Short-lived signed token for the navigator.sendBeacon close (POST /sessions/:id/close). */
  closeToken: string;
  /** A one-click summary session: the feed shows the whole report, times as offsets from mediaStartAt. */
  summary: boolean;
  /** Epoch ms of the summary's media time 0 (its run's start); null for every other session. */
  mediaStartAt: number | null;
}

export interface LiveHeartbeatView {
  state: LiveSessionState;
  statusCode: LiveStatusCode;
  usage: LiveSessionUsageView;
}

export interface LiveSessionStateView {
  sessionId: string;
  state: LiveSessionState;
  language: string;
  runId: string | null;
}

export interface LiveCloseView {
  closed: boolean;
}

/** The run fields accrual reads. */
export interface LiveRunAccrualView {
  status: LiveRunStatus;
  lastCommitAt: Date | null;
  startedAt: Date;
  /** Seconds of a recorded video the run has transcribed (summary billing). */
  processedMediaSeconds: number;
}

export interface LiveAccrualInput {
  now: number;
  /** This session's previous heartbeat, epoch ms (null on the first). */
  lastHeartbeatAt: number | null;
  /** The (user, run) accrual mark, epoch ms (null when absent). */
  accruedUntil: number | null;
}

export interface LiveAccrualResult {
  seconds: number;
  /** New (user, run) accrual mark; null when nothing changes. */
  nextAccruedUntil: number | null;
}

export interface LiveCoverageInput {
  latestToAt: number | null;
  playbackAt: number;
  /** Wall-clock ms since the previous heartbeat. */
  elapsedMs: number;
}

export interface LiveGapInput {
  atLiveEdge: boolean;
  seekableFromAt: number | undefined;
  lastPlaybackAt: number | null;
}

export interface LiveCloseTokenClaims {
  sessionId: string;
  userId: string;
  expiresAt: number;
}

export interface LiveHeartbeatWrite {
  expectedState: LiveSessionState;
  state: LiveSessionState;
  lastHeartbeatAt: Date;
  lastPlaybackAt: bigint;
  pendingIncrement: number;
  /** Summary sessions: move accruedMediaSeconds from `from` to `to` (fenced on `from`). */
  media?: { from: number; to: number };
}
