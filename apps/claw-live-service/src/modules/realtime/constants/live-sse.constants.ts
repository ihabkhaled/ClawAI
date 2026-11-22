import { LiveSessionState } from '../../../generated/prisma';

/** Comment line written to keep proxies from closing an idle SSE connection. */
export const LIVE_SSE_HEARTBEAT_MS = 15_000;

/** How often an open stream re-reads its session (state, language, run). */
export const LIVE_SSE_SESSION_REFRESH_MS = 5000;

/** Session states in which no AI event reaches the viewer (status events still do). */
export const LIVE_SSE_AI_BLOCKED_STATES: readonly LiveSessionState[] = [
  LiveSessionState.CREDITS_REQUIRED,
  LiveSessionState.EXHAUSTED,
  LiveSessionState.UNSUPPORTED,
  LiveSessionState.DETACHED,
];

export const LIVE_SSE_HEADERS: Readonly<Record<string, string>> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};
