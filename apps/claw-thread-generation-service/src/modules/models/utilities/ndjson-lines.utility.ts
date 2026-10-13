import { ServiceUnavailableException } from '@nestjs/common';

import {
  MODEL_STREAM_MALFORMED_MESSAGE,
  MODEL_STREAM_MAX_LINE_CHARS,
} from '../constants/model-call.constants';
import type { NdjsonReadOptions } from '../types/model-call.types';

function parseLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    // The line itself is never put in the message: it is upstream output.
    throw new ServiceUnavailableException(MODEL_STREAM_MALFORMED_MESSAGE);
  }
}

/**
 * Reads a newline-delimited JSON body incrementally. A line may be split across any number
 * of chunks (and a multi-byte character across two), so text is buffered until its newline.
 * `onBytes` fires for every chunk, which is what keeps a silence timer honest: bytes
 * arriving is activity, a timer firing is not. Leaving the loop early cancels the reader.
 */
export async function* readNdjsonLines(
  body: ReadableStream<Uint8Array>,
  { onBytes, signal }: NdjsonReadOptions,
): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const cancelReader = (): void => {
    void (async () => {
      try {
        await reader.cancel();
      } catch {
        // The stream is only being dropped; one that already failed or closed is fine.
      }
    })();
  };
  signal.addEventListener('abort', cancelReader, { once: true });
  let pending = '';
  try {
    let chunk = await reader.read();
    while (!chunk.done) {
      onBytes();
      pending += decoder.decode(chunk.value, { stream: true });
      let newline = pending.indexOf('\n');
      while (newline >= 0) {
        const line = pending.slice(0, newline).trim();
        pending = pending.slice(newline + 1);
        if (line) yield parseLine(line);
        newline = pending.indexOf('\n');
      }
      if (pending.length > MODEL_STREAM_MAX_LINE_CHARS) {
        throw new ServiceUnavailableException(MODEL_STREAM_MALFORMED_MESSAGE);
      }
      chunk = await reader.read();
    }
    const tail = (pending + decoder.decode()).trim();
    if (tail) yield parseLine(tail);
  } finally {
    signal.removeEventListener('abort', cancelReader);
    cancelReader();
  }
}
