import { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import { LIVE_SSE_AI_BLOCKED_STATES } from '../constants/live-sse.constants';
import type { LiveEventEnvelope, ParsedLastEventId } from '../types/live-event-bus.types';
import type { LiveSseSessionView } from '../types/live-sse.types';

/** The session an event is addressed to, when it is session-scoped (billing status, usage). */
export function eventSessionId(event: LiveEventEnvelope): string | null {
  const value = event.data['sessionId'];
  return typeof value === 'string' ? value : null;
}

/** The session state a session-scoped status event carries, if any. */
export function eventSessionState(event: LiveEventEnvelope): string | null {
  const value = event.data['sessionState'];
  return typeof value === 'string' ? value : null;
}

/**
 * Per-viewer filter. Never forwards another run's events or another session's
 * scoped events; translations only in the viewer's language; no AI events while
 * the session needs credits or is exhausted. Status events always pass.
 */
export function shouldDeliver(event: LiveEventEnvelope, view: LiveSseSessionView): boolean {
  if (view.runId === null || event.runId !== view.runId) return false;
  const scopedTo = eventSessionId(event);
  if (scopedTo !== null && scopedTo !== view.sessionId) return false;
  if (event.type === LiveStreamEventType.STATUS) return true;
  if (event.type === LiveStreamEventType.USAGE) return scopedTo !== null;
  if (LIVE_SSE_AI_BLOCKED_STATES.includes(view.state)) return false;
  const isTranslation =
    event.type === LiveStreamEventType.CAPTION_TRANSLATION || event.language !== undefined;
  return isTranslation
    ? (event.language ?? '').toLowerCase() === view.language.toLowerCase()
    : true;
}

/** Reads `<runId>:<seq>`; anything else is treated as a fresh open. */
export function parseLastEventId(raw: string | undefined): ParsedLastEventId | null {
  if (!raw) return null;
  const separator = raw.lastIndexOf(':');
  if (separator <= 0) return null;
  const seq = Number(raw.slice(separator + 1));
  return !Number.isSafeInteger(seq) || seq < 0 ? null : { runId: raw.slice(0, separator), seq };
}

/** Parses one frame off the channel or replay list; null when malformed. */
export function parseEnvelope(raw: string): LiveEventEnvelope | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Partial<LiveEventEnvelope>;
  const valid =
    typeof record.id === 'string' &&
    typeof record.seq === 'number' &&
    typeof record.runId === 'string' &&
    typeof record.type === 'string' &&
    typeof record.data === 'object' &&
    record.data !== null;
  return valid ? (record as LiveEventEnvelope) : null;
}

/** One SSE frame: `id`, `event` (the type) and a single JSON data line. */
export function formatSseFrame(event: LiveEventEnvelope): string {
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
