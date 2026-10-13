import {
  INTERNAL_GENERATE_ACTIVITY_MIN_INTERVAL_MS,
  INTERNAL_GENERATE_NDJSON_CONTENT_TYPE,
} from '../constants/internal-generate.constants';
import type {
  InternalGenerateErrorFrame,
  InternalGenerateFrame,
  InternalGenerateResponse,
  NdjsonSink,
} from '../types/internal-generate.types';

/**
 * Writes the `generate-stream` body: one JSON object per line, never a partial
 * line, never anything after the terminal line.
 *
 * Headers are flushed on construction so the caller's connection is open (and
 * its own idle clock is running against real bytes) before the first provider
 * call. Every write is a no-op once the sink is closed or the terminal line has
 * been written, so a late `activity` from a stream that is being torn down
 * cannot corrupt the end of the body.
 */
export class InternalGenerateFrameWriter {
  private lastActivityAt: number | undefined;
  private terminal = false;

  constructor(
    private readonly sink: NdjsonSink,
    private readonly now: () => number,
  ) {
    sink.statusCode = 200;
    sink.setHeader('Content-Type', INTERNAL_GENERATE_NDJSON_CONTENT_TYPE);
    // No caching, no transformation, no proxy buffering: a buffered NDJSON
    // stream delivers its activity lines all at once at the end, which is the
    // same as having none.
    sink.setHeader('Cache-Control', 'no-cache, no-transform');
    sink.setHeader('X-Accel-Buffering', 'no');
    sink.flushHeaders();
  }

  /** Proof of life. Written at most once per interval. */
  activity(): void {
    const at = this.now();
    if (
      this.lastActivityAt !== undefined &&
      at - this.lastActivityAt < INTERNAL_GENERATE_ACTIVITY_MIN_INTERVAL_MS
    ) {
      return;
    }
    this.lastActivityAt = at;
    this.writeFrame({ type: 'activity' });
  }

  result(data: InternalGenerateResponse): void {
    this.writeTerminal({ type: 'result', data });
  }

  error(frame: InternalGenerateErrorFrame): void {
    this.writeTerminal(frame);
  }

  /** Ends the body. Safe to call twice. */
  end(): void {
    if (!this.sink.writableEnded && !this.sink.destroyed) {
      this.sink.end();
    }
  }

  private writeTerminal(frame: InternalGenerateFrame): void {
    if (this.terminal) {
      return;
    }
    this.writeFrame(frame);
    this.terminal = true;
  }

  private writeFrame(frame: InternalGenerateFrame): void {
    if (this.terminal || this.sink.writableEnded || this.sink.destroyed) {
      return;
    }
    this.sink.write(`${JSON.stringify(frame)}\n`);
  }
}
