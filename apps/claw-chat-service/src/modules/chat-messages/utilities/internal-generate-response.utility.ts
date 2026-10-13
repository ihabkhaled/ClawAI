import { Logger } from '@nestjs/common';

import type {
  InternalGenerateResponse,
  InternalGenerateStreamOptions,
  NdjsonResponse,
} from '../types/internal-generate.types';
import { toInternalGenerateErrorFrame } from './internal-generate-failure.utility';
import { InternalGenerateFrameWriter } from './internal-generate-frame-writer.utility';

const logger = new Logger('InternalGenerateStream');

/**
 * Answers one `generate-stream` request: headers first, then `activity` lines
 * as provider bytes arrive, then exactly one `result` or `error` line.
 *
 * If the caller disconnects before the terminal line, `run` is handed an
 * aborted signal, which stops the provider call and gives the credit hold back.
 * Nothing is written to a connection that is already gone.
 *
 * Lives here rather than in the controller because the failure has to become a
 * line in a body that is already 200; the exception filter can no longer set a
 * status once the first byte is out.
 */
export async function respondWithGenerateStream(
  response: NdjsonResponse,
  run: (options: InternalGenerateStreamOptions) => Promise<InternalGenerateResponse>,
  now: () => number = Date.now,
): Promise<void> {
  const abort = new AbortController();
  const writer = new InternalGenerateFrameWriter(response, now);
  const onClose = (): void => {
    if (!response.writableEnded) {
      abort.abort();
    }
  };
  response.once('close', onClose);
  try {
    const data = await run({ signal: abort.signal, onActivity: () => writer.activity() });
    writer.result(data);
  } catch (error: unknown) {
    if (abort.signal.aborted) {
      logger.warn('generate-stream: caller disconnected; provider call stopped');
    } else {
      logger.warn(
        `generate-stream: failed - ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      writer.error(toInternalGenerateErrorFrame(error));
    }
  } finally {
    response.off('close', onClose);
    writer.end();
  }
}
