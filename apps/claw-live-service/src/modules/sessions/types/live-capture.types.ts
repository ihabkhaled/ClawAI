import type { LiveCapability, LiveSessionState } from '../../../generated/prisma';

/** What the audio route needs to know about the session it is pushing into. */
export interface LiveCaptureTarget {
  sessionId: string;
  state: LiveSessionState;
  capability: LiveCapability;
  runId: string | null;
  /** The run's capture owner, or null when the session has no run. */
  captureSessionId: string | null;
  /** Last heartbeat, or null before the first one. */
  lastHeartbeatAt: Date | null;
  startedAt: Date;
}

/** A validated WAV chunk: the PCM data length decides the media duration. */
export interface CaptureWavInfo {
  durationMs: number;
}

export interface LiveCaptureAcceptedView {
  accepted: true;
}
