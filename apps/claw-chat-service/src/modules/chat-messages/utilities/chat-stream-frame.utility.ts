import { StreamEventType } from '../../../common/enums';
import type { StreamEvent } from '../types/stream.types';

/**
 * Decodes one frame from the Redis fan-out channel.
 *
 * Returns null instead of throwing, because this runs inside the Redis
 * subscriber callback. An exception escaping there takes down the subscription
 * for the whole replica, which would leave every SSE connection it is serving
 * open and permanently silent — a failure indistinguishable, from the reader's
 * side, from a model that stopped answering. One bad frame is worth dropping;
 * every future frame is not.
 */
export function parseStreamFrame(payload: string): StreamEvent | null {
  try {
    return JSON.parse(payload) as StreamEvent;
  } catch {
    return null;
  }
}

/** The message from an unknown thrown value, for a log line. */
export function describeStreamError(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

/**
 * The sequence number out of a wire eventId (`"<threadId>:<sequence>"`).
 *
 * Thread ids are cuids constrained to `CHAT_STREAM_THREAD_ID_PATTERN`, which
 * excludes `:`, so the LAST colon is unambiguous even though it is a plain
 * split rather than a full parse. Returns undefined for anything that does not
 * look like one of ours — a stale id from before this format, a client sending
 * garbage — so the caller falls back to "replay everything" rather than
 * resuming from a number that means nothing.
 */
export function parseEventSequence(eventId: string | undefined): number | undefined {
  if (eventId === undefined) {
    return undefined;
  }
  const separatorIndex = eventId.lastIndexOf(':');
  if (separatorIndex === -1) {
    return undefined;
  }
  const sequencePart = eventId.slice(separatorIndex + 1);
  return !/^\d+$/u.test(sequencePart) ? undefined : Number.parseInt(sequencePart, 10);
}

/**
 * Keeps only the frames of the run that started last.
 *
 * A run opens with REQUEST_ACCEPTED and ends with DONE or ERROR. The replay
 * buffer is cleared when a run starts, but that delete is fire-and-forget, so a
 * client attaching in that window used to read the PREVIOUS run's terminal DONE
 * first and stop listening. Cutting everything before the latest
 * REQUEST_ACCEPTED makes the run boundary a property of the frames themselves,
 * not of the delete winning a race. A buffer with no REQUEST_ACCEPTED (an older
 * run that rolled past the cap, or a frame source that never sent one) is
 * returned unchanged.
 */
export function scopeToLatestRun(frames: StreamEvent[]): StreamEvent[] {
  const runStarts = frames.flatMap((frame, index) =>
    frame.type === StreamEventType.REQUEST_ACCEPTED ? [index] : [],
  );
  const latestStart = runStarts.at(-1);
  return latestStart === undefined ? frames : frames.slice(latestStart);
}
