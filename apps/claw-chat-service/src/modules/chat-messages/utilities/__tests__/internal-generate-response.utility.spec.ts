import { EventEmitter } from 'node:events';

import { BusinessException } from '../../../../common/errors';
import type {
  InternalGenerateResponse,
  InternalGenerateStreamOptions,
  NdjsonResponse,
} from '../../types/internal-generate.types';
import { InternalGenerateFrameWriter } from '../internal-generate-frame-writer.utility';
import { respondWithGenerateStream } from '../internal-generate-response.utility';

/** A response double that records what an HTTP response would have put on the wire. */
class FakeResponse extends EventEmitter implements NdjsonResponse {
  writableEnded = false;
  destroyed = false;
  statusCode = 0;
  readonly headers = new Map<string, string>();
  readonly written: string[] = [];
  flushed = false;

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

  flushHeaders(): void {
    this.flushed = true;
  }

  write(chunk: string): boolean {
    this.written.push(chunk);
    return true;
  }

  end(): this {
    this.writableEnded = true;
    return this;
  }

  /** What the other side parsed: one JSON object per line. */
  frames(): unknown[] {
    return this.written
      .join('')
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line): unknown => JSON.parse(line));
  }

  /** The caller hanging up. */
  hangUp(): void {
    this.destroyed = true;
    this.emit('close');
  }
}

const RESULT: InternalGenerateResponse = {
  content: 'draft',
  provider: 'OLLAMA',
  model: 'kimi',
  inputTokens: 10,
  outputTokens: 20,
  durationMs: 1234,
  clamped: false,
  costMicroUsd: 42,
};

describe('InternalGenerateFrameWriter', () => {
  it('flushes NDJSON headers before anything else is written', () => {
    const response = new FakeResponse();

    new InternalGenerateFrameWriter(response, () => 0);

    expect(response.statusCode).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/x-ndjson; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toContain('no-transform');
    expect(response.headers.get('X-Accel-Buffering')).toBe('no');
    expect(response.flushed).toBe(true);
    expect(response.written).toEqual([]);
  });

  it('writes one complete JSON object per line', () => {
    const response = new FakeResponse();
    const writer = new InternalGenerateFrameWriter(response, () => 0);

    writer.activity();
    writer.result(RESULT);

    expect(response.written.every((piece) => piece.endsWith('\n'))).toBe(true);
    expect(response.frames()).toEqual([{ type: 'activity' }, { type: 'result', data: RESULT }]);
  });

  it('throttles activity to one line per interval, always writing the first', () => {
    let clock = 10_000;
    const response = new FakeResponse();
    const writer = new InternalGenerateFrameWriter(response, () => clock);

    writer.activity();
    clock += 300;
    writer.activity();
    clock += 300;
    writer.activity();
    expect(response.frames()).toHaveLength(1);

    clock += 500;
    writer.activity();
    expect(response.frames()).toHaveLength(2);
  });

  it('writes nothing after the terminal line', () => {
    const response = new FakeResponse();
    const writer = new InternalGenerateFrameWriter(response, () => 0);

    writer.error({ type: 'error', status: 504, code: 'MODEL_IDLE_TIMEOUT', message: 'silent' });
    writer.activity();
    writer.result(RESULT);

    expect(response.frames()).toEqual([
      { type: 'error', status: 504, code: 'MODEL_IDLE_TIMEOUT', message: 'silent' },
    ]);
  });

  it('writes nothing to a connection that is already gone, and ends only once', () => {
    const response = new FakeResponse();
    const writer = new InternalGenerateFrameWriter(response, () => 0);
    response.destroyed = true;

    writer.activity();
    writer.end();

    expect(response.written).toEqual([]);
    expect(response.writableEnded).toBe(false);
  });
});

describe('respondWithGenerateStream', () => {
  it('relays activity as it happens, then exactly one result line, then ends', async () => {
    const response = new FakeResponse();
    let clock = 0;

    await respondWithGenerateStream(
      response,
      async (options) => {
        options.onActivity(10);
        clock += 2_000;
        options.onActivity(10);
        return Promise.resolve(RESULT);
      },
      () => clock,
    );

    expect(response.frames()).toEqual([
      { type: 'activity' },
      { type: 'activity' },
      { type: 'result', data: RESULT },
    ]);
    expect(response.writableEnded).toBe(true);
  });

  it('turns a failure into one coded error line in a 200 body', async () => {
    const response = new FakeResponse();

    await respondWithGenerateStream(response, () =>
      Promise.reject(new BusinessException('sent nothing', 'MODEL_IDLE_TIMEOUT', 504)),
    );

    expect(response.statusCode).toBe(200);
    expect(response.frames()).toEqual([
      { type: 'error', status: 504, code: 'MODEL_IDLE_TIMEOUT', message: 'sent nothing' },
    ]);
    expect(response.writableEnded).toBe(true);
  });

  it('aborts the provider call the moment the caller hangs up, and writes no error line', async () => {
    const response = new FakeResponse();
    let seen: InternalGenerateStreamOptions | undefined;
    let abortedAtHangUp: boolean | undefined;

    await respondWithGenerateStream(response, (options) => {
      seen = options;
      return new Promise<InternalGenerateResponse>((_resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => {
            abortedAtHangUp = true;
            reject(new BusinessException('cancelled', 'CLIENT_ABORTED', 408));
          },
          { once: true },
        );
        response.hangUp();
      });
    });

    expect(seen?.signal.aborted).toBe(true);
    expect(abortedAtHangUp).toBe(true);
    expect(response.frames()).toEqual([]);
  });

  it('does not treat the close that follows a finished response as a hang-up', async () => {
    const response = new FakeResponse();
    let signal: AbortSignal | undefined;

    await respondWithGenerateStream(response, (options) => {
      signal = options.signal;
      return Promise.resolve(RESULT);
    });
    response.emit('close');

    expect(signal?.aborted).toBe(false);
  });
});
