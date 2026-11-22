import type { LiveSessionState } from '../../../generated/prisma';

/** What an open SSE stream knows about its session; refreshed periodically. */
export interface LiveSseSessionView {
  sessionId: string;
  userId: string;
  runId: string | null;
  language: string;
  state: LiveSessionState;
}
