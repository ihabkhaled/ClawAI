import { AppConfig } from '../../../app/config/app.config';
import {
  DeterministicGenerationError,
  isDeterministicGenerationError,
} from '../../generation/utilities/deterministic-generation.error';
import { GenerationAttemptTimeoutError } from '../../generation/utilities/generation-attempt-timeout.error';
import { parseStepError } from '../../generation/utilities/parse-step-error.utility';
import { ThreadGenerationCancelledError } from '../../generation/utilities/thread-generation-cancelled.error';
import { ChatModelClient, type ChatModelRequest } from '../chat-model.client';
import { ChatModelIncompleteError } from '../chat-model-incomplete.error';
import { ModelCallCeilingError } from '../model-call-ceiling.error';
import { type ModelContextClient } from '../model-context.client';

const request: ChatModelRequest = {
  ownerId: 'owner-1',
  requestId: 'job-1:author-1:round-1',
  budgetId: 'budget-1',
  provider: 'OLLAMA',
  model: 'kimi-k2.6',
  systemPrompt: 'system',
  userPrompt: 'user',
  maxOutputTokens: 1_024,
};

const reply = {
  content: '{"a":1}',
  provider: 'OLLAMA',
  model: 'kimi-k2.6',
  durationMs: 10,
  clamped: false,
};

const encoder = new TextEncoder();
const line = (frame: unknown): string => `${JSON.stringify(frame)}\n`;
const resultLine = (data: Record<string, unknown> = {}): string =>
  line({ type: 'result', data: { ...reply, ...data } });

function wholeResponse(...lines: string[]): Response {
  return new Response(lines.join(''), { status: 200 });
}

type LiveResponse = { response: Response; push: (text: string) => void; end: () => void };

/** A response whose body the test feeds by hand, like a model that streams slowly. */
function liveResponse(): LiveResponse {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const body = new ReadableStream<Uint8Array>({
    start(started) {
      controller = started;
    },
  });
  return {
    response: new Response(body, { status: 200 }),
    push: (text) => {
      try {
        controller?.enqueue(encoder.encode(text));
      } catch {
        // The reader already cancelled the stream, as it does once the call is over.
      }
    },
    end: () => {
      controller?.close();
    },
  };
}

/** Like a real fetch: an aborted signal rejects the call and errors the body. */
function fetchReturning(...responses: Response[]) {
  return vi.fn().mockImplementation((_url: string, init: RequestInit) => {
    const next = responses.shift();
    return init.signal?.aborted
      ? Promise.reject(init.signal.reason)
      : Promise.resolve(next ?? new Response('', { status: 500 }));
  });
}

function client(): ChatModelClient {
  const modelContext = {
    getWindow: vi.fn().mockResolvedValue({ tokens: 128_000, source: 'known' }),
  } as unknown as ModelContextClient;
  return new ChatModelClient(modelContext);
}

const failureOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => null,
    (error: unknown) => error,
  );

describe('ChatModelClient streaming', () => {
  beforeEach(() => {
    vi.stubEnv('THREAD_GENERATION_DATABASE_URL', 'postgresql://claw:secret@localhost:5432/db');
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(40));
    vi.stubEnv('CHAT_SERVICE_URL', 'http://chat-service:4002');
    AppConfig.validate();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('reading frames', () => {
    it('asks the stream route for ndjson and returns the result frame', async () => {
      const fetchMock = fetchReturning(
        wholeResponse(line({ type: 'activity' }), resultLine({ costMicroUsd: 321 })),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await client().generate(request);

      expect(result).toMatchObject({ content: '{"a":1}', costMicroUsd: 321 });
      const [url, init] = fetchMock.mock.calls[0] ?? [];
      expect(url).toBe('http://chat-service:4002/api/v1/internal/chat/generate-stream');
      expect(init.headers).toMatchObject({ Accept: 'application/x-ndjson' });
      expect(JSON.parse(String(init.body))).toMatchObject({
        threadJobBudgetId: 'budget-1',
        surface: 'THREADS',
        workflow: 'threads_generation',
      });
    });

    it('reads frames split across chunks, even mid-token', async () => {
      const live = liveResponse();
      vi.stubGlobal('fetch', fetchReturning(live.response));
      const text = line({ type: 'activity' }) + resultLine();
      const outcome = client().generate(request);

      for (let at = 0; at < text.length; at += 7) live.push(text.slice(at, at + 7));
      live.end();

      await expect(outcome).resolves.toMatchObject({ content: '{"a":1}' });
    });

    it('ignores a frame of an unknown type and a frame it cannot read', async () => {
      vi.stubGlobal(
        'fetch',
        fetchReturning(
          wholeResponse(
            line({ type: 'progress', pct: 40 }),
            line({ nonsense: true }),
            line('text'),
            resultLine(),
          ),
        ),
      );

      await expect(client().generate(request)).resolves.toMatchObject({ content: '{"a":1}' });
    });

    it('stops reading at the result frame', async () => {
      vi.stubGlobal(
        'fetch',
        fetchReturning(
          wholeResponse(resultLine(), line({ type: 'error', status: 500, code: 'LATE_ERROR' })),
        ),
      );

      await expect(client().generate(request)).resolves.toMatchObject({ content: '{"a":1}' });
    });

    it('counts the cost of a result that was cut short as spent', async () => {
      vi.stubGlobal(
        'fetch',
        fetchReturning(wholeResponse(resultLine({ clamped: true, costMicroUsd: 90 }))),
      );

      const failure = await failureOf(client().generate(request));

      expect(failure).toBeInstanceOf(ChatModelIncompleteError);
      expect(failure).toHaveProperty('costMicroUsd', 90);
    });

    it('treats a stream that ends without a result as a transient gateway failure', async () => {
      vi.stubGlobal('fetch', fetchReturning(wholeResponse(line({ type: 'activity' }))));

      const failure = await failureOf(client().generate(request));

      expect(failure).toHaveProperty('message', 'Chat model stream ended without a result');
      expect(parseStepError(failure).code).toBe('PROVIDER_UNAVAILABLE');
      expect(isDeterministicGenerationError(failure)).toBe(false);
    });

    it('refuses a stream that is not JSON without echoing it', async () => {
      vi.stubGlobal('fetch', fetchReturning(wholeResponse('provider said hello\n')));

      const failure = await failureOf(client().generate(request));

      expect(failure).toHaveProperty('message', 'Chat model stream was malformed');
    });
  });

  describe('error frames', () => {
    it.each([
      ['CLOUD_PROVIDER_EMPTY_RESPONSE', 502],
      ['MODEL_REASONED_NO_ANSWER', 502],
      ['MODEL_IDLE_TIMEOUT', 504],
      ['PAYG_CREDIT_EXHAUSTED', 402],
    ])('keeps the machine code and status of %s', async (code, status) => {
      vi.stubGlobal(
        'fetch',
        fetchReturning(
          wholeResponse(
            line({ type: 'activity' }),
            line({ type: 'error', status, code, message: 'Bearer sk-secretsecretsecret leaked' }),
          ),
        ),
      );

      const failure = await failureOf(client().generate(request));

      expect(failure).toHaveProperty(
        'message',
        `Chat model request failed (${String(status)}: ${code})`,
      );
      expect(parseStepError(failure)).toEqual({ code, httpStatus: status });
      expect(isDeterministicGenerationError(failure)).toBe(false);
    });

    it('turns a hard ceiling frame into a failure the same model is not retried for', async () => {
      vi.stubGlobal(
        'fetch',
        fetchReturning(
          wholeResponse(line({ type: 'error', status: 504, code: 'MODEL_HARD_CEILING' })),
        ),
      );

      const failure = await failureOf(client().generate(request));

      expect(failure).toBeInstanceOf(ModelCallCeilingError);
      expect(failure).toBeInstanceOf(DeterministicGenerationError);
      expect(parseStepError(failure)).toEqual({ code: 'MODEL_HARD_CEILING', httpStatus: 504 });
    });

    it('survives an error frame with no readable code or status', async () => {
      vi.stubGlobal(
        'fetch',
        fetchReturning(wholeResponse(line({ type: 'error', status: 'x', code: 'bad code' }))),
      );

      const failure = await failureOf(client().generate(request));

      expect(failure).toHaveProperty('message', 'Chat model request failed (502)');
    });

    it('keeps the code of a refusal that came before any frame', async () => {
      vi.stubGlobal(
        'fetch',
        fetchReturning(
          new Response(JSON.stringify({ code: 'PAYG_CREDIT_EXHAUSTED', message: 'free text' }), {
            status: 402,
          }),
        ),
      );

      const failure = await failureOf(client().generate(request));

      expect(parseStepError(failure)).toEqual({ code: 'PAYG_CREDIT_EXHAUSTED', httpStatus: 402 });
    });
  });

  describe('silence, not the clock', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('lets a model that keeps streaming run far past the old fixed 180 s', async () => {
      const live = liveResponse();
      vi.stubGlobal('fetch', fetchReturning(live.response));
      const outcome = client().generate(request);

      for (const step of [200, 200, 200]) {
        await vi.advanceTimersByTimeAsync(step * 1_000);
        live.push(line({ type: 'activity' }));
      }
      await vi.advanceTimersByTimeAsync(10_000);
      live.push(resultLine());

      await expect(outcome).resolves.toMatchObject({ content: '{"a":1}' });
    });

    it('gives up after 330 s of silence with MODEL_IDLE_TIMEOUT', async () => {
      const live = liveResponse();
      vi.stubGlobal('fetch', fetchReturning(live.response));
      let settled = false;
      const outcome = failureOf(client().generate(request)).finally(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(329_999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const failure = await outcome;

      expect(failure).toHaveProperty('message', 'Chat model call went silent');
      expect(parseStepError(failure).code).toBe('MODEL_IDLE_TIMEOUT');
      expect(isDeterministicGenerationError(failure)).toBe(false);
    });

    it('counts silence from the last bytes, not from the start', async () => {
      const live = liveResponse();
      vi.stubGlobal('fetch', fetchReturning(live.response));
      let settled = false;
      const outcome = failureOf(client().generate(request)).finally(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(100_000);
      live.push(line({ type: 'activity' }));
      await vi.advanceTimersByTimeAsync(329_000);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1_000);

      expect(await outcome).toHaveProperty('message', 'Chat model call went silent');
    });

    it('stops a call that is still streaming at 630 s with MODEL_HARD_CEILING', async () => {
      const live = liveResponse();
      vi.stubGlobal('fetch', fetchReturning(live.response));
      const outcome = failureOf(client().generate(request));

      for (let second = 0; second < 700; second += 100) {
        await vi.advanceTimersByTimeAsync(100_000);
        live.push(line({ type: 'activity' }));
      }
      const failure = await outcome;

      expect(failure).toBeInstanceOf(ModelCallCeilingError);
      expect(parseStepError(failure).code).toBe('MODEL_HARD_CEILING');
      expect(isDeterministicGenerationError(failure)).toBe(true);
    });

    it('releases its timers when the call ends', async () => {
      vi.stubGlobal('fetch', fetchReturning(wholeResponse(resultLine())));

      await client().generate(request);

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('cancellation', () => {
    it('aborts the call in flight and reports the job reason', async () => {
      const live = liveResponse();
      const fetchMock = fetchReturning(live.response);
      vi.stubGlobal('fetch', fetchMock);
      const job = new AbortController();
      const outcome = failureOf(client().generate({ ...request, signal: job.signal }));
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledOnce();
      });
      const reason = new ThreadGenerationCancelledError();

      job.abort(reason);

      expect(await outcome).toBe(reason);
      expect(fetchMock.mock.calls[0]?.[1].signal.aborted).toBe(true);
    });

    it('reports an attempt that ran out of time as that, not as a cancel', async () => {
      vi.stubGlobal('fetch', fetchReturning(liveResponse().response));
      const job = new AbortController();
      const outcome = failureOf(client().generate({ ...request, signal: job.signal }));

      job.abort(new GenerationAttemptTimeoutError());

      expect(await outcome).toBeInstanceOf(GenerationAttemptTimeoutError);
    });

    it('treats a bare abort as a cancel', async () => {
      vi.stubGlobal('fetch', fetchReturning(liveResponse().response));
      const job = new AbortController();
      const outcome = failureOf(client().generate({ ...request, signal: job.signal }));

      job.abort();

      expect(await outcome).toBeInstanceOf(ThreadGenerationCancelledError);
    });

    it('does not wait for the gateway when the job was already cancelled', async () => {
      const fetchMock = fetchReturning(wholeResponse(resultLine()));
      vi.stubGlobal('fetch', fetchMock);
      const job = new AbortController();
      job.abort(new ThreadGenerationCancelledError());

      const failure = await failureOf(client().generate({ ...request, signal: job.signal }));

      expect(failure).toBeInstanceOf(ThreadGenerationCancelledError);
    });

    it('stops reading a body that is mid-line when the job is cancelled', async () => {
      const live = liveResponse();
      vi.stubGlobal('fetch', fetchReturning(live.response));
      const job = new AbortController();
      const outcome = failureOf(client().generate({ ...request, signal: job.signal }));
      await vi.waitFor(() => {
        expect(live.response.body?.locked).toBe(true);
      });
      live.push('{"type":"res');

      job.abort(new ThreadGenerationCancelledError());

      expect(await outcome).toBeInstanceOf(ThreadGenerationCancelledError);
    });
  });

  describe('one release of fallback to the buffered route', () => {
    it('calls the old route when the stream route answers 404', async () => {
      const fetchMock = fetchReturning(
        new Response('Not Found', { status: 404 }),
        new Response(JSON.stringify({ ...reply, costMicroUsd: 55 }), { status: 200 }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await client().generate(request);

      expect(result).toMatchObject({ content: '{"a":1}', costMicroUsd: 55 });
      expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
        'http://chat-service:4002/api/v1/internal/chat/generate-stream',
        'http://chat-service:4002/api/v1/internal/chat/generate',
      ]);
    });

    it('keeps the code of a refusal from the old route', async () => {
      vi.stubGlobal(
        'fetch',
        fetchReturning(
          new Response('', { status: 404 }),
          new Response(JSON.stringify({ code: 'CLOUD_PROVIDER_EMPTY_RESPONSE' }), { status: 502 }),
        ),
      );

      const failure = await failureOf(client().generate(request));

      expect(parseStepError(failure)).toEqual({
        code: 'CLOUD_PROVIDER_EMPTY_RESPONSE',
        httpStatus: 502,
      });
    });

    it('has no activity to watch there, so only the ceiling applies', async () => {
      vi.useFakeTimers();
      const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
        if (url.endsWith('/generate-stream')) {
          return Promise.resolve(new Response('', { status: 404 }));
        }
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason);
          });
        });
      });
      vi.stubGlobal('fetch', fetchMock);
      let settled = false;
      const outcome = failureOf(client().generate(request)).finally(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(600_000);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(30_000);

      expect(await outcome).toBeInstanceOf(ModelCallCeilingError);
    });

    it('does not fall back on any other status', async () => {
      const fetchMock = fetchReturning(new Response('', { status: 503 }));
      vi.stubGlobal('fetch', fetchMock);

      await failureOf(client().generate(request));

      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('reports an unreachable gateway as unavailable', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

      const failure = await failureOf(client().generate(request));

      expect(parseStepError(failure).code).toBe('PROVIDER_UNAVAILABLE');
    });
  });
});
