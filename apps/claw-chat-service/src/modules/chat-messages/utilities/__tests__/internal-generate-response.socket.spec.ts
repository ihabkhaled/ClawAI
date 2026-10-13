import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import type {
  InternalGenerateResponse,
  InternalGenerateStreamOptions,
} from '../../types/internal-generate.types';
import { respondWithGenerateStream } from '../internal-generate-response.utility';

/**
 * The stream over a REAL socket. The fake-response specs prove what is written;
 * this proves it leaves the process as it is written (no buffering ahead of the
 * terminal line) and that a caller hanging up reaches the provider call.
 */
const RESULT: InternalGenerateResponse = {
  content: 'draft',
  provider: 'OLLAMA',
  model: 'kimi',
  durationMs: 7,
  clamped: false,
};

type Gate = { open: () => void; opened: Promise<void> };
const gate = (): Gate => {
  const holder: { release?: () => void } = {};
  const opened = new Promise<void>((resolve) => {
    holder.release = resolve;
  });
  return { open: () => holder.release?.(), opened };
};

describe('generate-stream over a real socket', () => {
  let server: Server;
  let url: string;
  let run: (options: InternalGenerateStreamOptions) => Promise<InternalGenerateResponse>;

  beforeEach(async () => {
    server = createServer((_request, response) => {
      void respondWithGenerateStream(response, (options) => run(options));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/generate-stream`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('delivers the activity line while the call is still running, then the result', async () => {
    const finish = gate();
    run = async (options) => {
      options.onActivity(5);
      await finish.opened;
      return RESULT;
    };

    const response = await fetch(url, { method: 'POST' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    const reader = (response.body ?? new ReadableStream<Uint8Array>()).getReader();
    const decoder = new TextDecoder();

    // The first line is readable BEFORE the call has finished: nothing is buffered.
    const first = await reader.read();
    expect(decoder.decode(first.value)).toBe('{"type":"activity"}\n');

    finish.open();
    let rest = '';
    for (;;) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      rest += decoder.decode(next.value, { stream: true });
    }
    expect(rest).toBe(`${JSON.stringify({ type: 'result', data: RESULT })}\n`);
  });

  it('aborts the provider call when the caller disconnects', async () => {
    const started = gate();
    const aborted = gate();
    run = (options) => {
      options.signal.addEventListener('abort', () => aborted.open(), { once: true });
      started.open();
      return new Promise<InternalGenerateResponse>((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('stopped')), {
          once: true,
        });
      });
    };

    const caller = new AbortController();
    const request = fetch(url, { method: 'POST', signal: caller.signal });
    request.catch(() => 'hung up');
    await started.opened;
    const hangUpAt = Date.now();
    caller.abort();

    await aborted.opened;
    // The owner's bar is about two seconds end to end; the socket part is instant.
    expect(Date.now() - hangUpAt).toBeLessThan(2_000);
  });
});
