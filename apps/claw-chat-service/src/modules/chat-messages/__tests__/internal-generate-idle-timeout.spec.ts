import { vi } from 'vitest';
import { PaygSurface } from '@claw/shared-types';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { InternalGenerateArgs } from '../types/internal-generate.types';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return { isExposed: vi.fn().mockResolvedValue(true) };
  }),
}));
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

/**
 * The whole chain with the real HTTP client: only `fetch` is faked. This is
 * the spec that proves the owner's rule end to end - a model that is still
 * sending (answer OR thinking) is never cut by the clock, 300 s of silence is
 * "stuck", 600 s is the ceiling, and cancelling stops the provider call.
 */
const SECOND = 1_000;

const ARGS: InternalGenerateArgs = {
  userId: 'user-1',
  requestId: 'job-1:author-1:round-1',
  threadJobBudgetId: 'budget-1',
  surface: PaygSurface.THREADS,
  provider: 'OLLAMA',
  model: 'kimi-k2.6',
  systemPrompt: 'sys',
  userPrompt: 'write the draft',
  workflow: 'threads_generation',
};

const thinkingFrame = JSON.stringify({
  message: { role: 'assistant', content: '', thinking: '.' },
});
const doneFrames = [
  JSON.stringify({ message: { role: 'assistant', content: 'Final draft.' } }),
  JSON.stringify({
    message: { role: 'assistant', content: '' },
    done: true,
    done_reason: 'stop',
    prompt_eval_count: 10,
    eval_count: 5,
  }),
];

type Upstream = {
  /** Sends one NDJSON line to the manager as if the provider had. */
  send: (line: string) => void;
  finish: () => void;
  /** The signal the provider fetch was given, once the call has been made. */
  providerSignal: () => AbortSignal | undefined;
};

/** Routes the connector lookup to a JSON reply and the provider call to a stream the test feeds. */
function installFetch(options: { holdProviderHeaders?: boolean } = {}): Upstream {
  const encoder = new TextEncoder();
  let bodyController: ReadableStreamDefaultController<Uint8Array> | undefined;
  let providerSignal: AbortSignal | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const href = url instanceof Request ? url.url : url.toString();
      if (href.includes('/internal/connectors/config')) {
        return Promise.resolve(
          new Response(JSON.stringify({ baseUrl: 'https://ollama.com/api', apiKey: 'k' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      providerSignal = init?.signal ?? undefined;
      return new Promise<Response>((resolve, reject) => {
        providerSignal?.addEventListener('abort', () => reject(providerSignal?.reason), {
          once: true,
        });
        if (options.holdProviderHeaders === true) {
          return;
        }
        resolve(
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                bodyController = controller;
                providerSignal?.addEventListener(
                  'abort',
                  () => controller.error(providerSignal?.reason),
                  {
                    once: true,
                  },
                );
              },
            }),
            { status: 200 },
          ),
        );
      });
    }),
  );
  return {
    send: (line) => bodyController?.enqueue(encoder.encode(`${line}\n`)),
    finish: () => bodyController?.close(),
    providerSignal: () => providerSignal,
  };
}

const buildExecution = (
  access: ReturnType<typeof createFakePaygAccessControl>,
): ChatExecutionManager =>
  new ChatExecutionManager(
    { buildPromptString: vi.fn().mockReturnValue('p') } as unknown as ContextAssemblyManager,
    {} as unknown as QualityCheckManager,
    { setExecutionManager: vi.fn() } as unknown as JudgeRefereeManager,
    {} as unknown as ChatStreamService,
    {} as unknown as SearchFirstManager,
    access as unknown as AccessControlService,
    {} as unknown as GeminiFilesApiManager,
    {} as unknown as LocalModelSelectionService,
  );

describe('generate-stream time limits, end to end', () => {
  let access: ReturnType<typeof createFakePaygAccessControl>;
  let manager: ChatExecutionManager;
  let caller: AbortController;

  type Settled =
    | { state: 'pending' }
    | { state: 'resolved'; value: unknown }
    | { state: 'rejected'; error: unknown };
  const start = (): { outcome: () => Settled } => {
    let settled: Settled = { state: 'pending' };
    manager.generateOnceStream(ARGS, { signal: caller.signal, onActivity: vi.fn() }).then(
      (value) => {
        settled = { state: 'resolved', value };
      },
      (error: unknown) => {
        settled = { state: 'rejected', error };
      },
    );
    return { outcome: () => settled };
  };
  const codeOf = (settled: Settled): unknown =>
    settled.state === 'rejected' && typeof settled.error === 'object' && settled.error !== null
      ? Reflect.get(settled.error, 'code')
      : undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    // The URL guard permits the hosts named by *_SERVICE_URL variables when any are set (CI sets
    // them), so the hosts this spec calls must be declared the way a deployed service declares them.
    vi.stubEnv('CONNECTOR_SERVICE_URL', 'http://connector:4011');
    vi.stubEnv('OLLAMA_SERVICE_URL', 'http://ollama:4008');
    vi.stubEnv('AUTH_SERVICE_URL', 'http://auth:4001');
    appConfigGet.mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://ollama:4008',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      CONNECTOR_SERVICE_URL: 'http://connector:4011',
      AUTH_SERVICE_URL: 'http://auth:4001',
    });
    access = createFakePaygAccessControl();
    manager = buildExecution(access);
    caller = new AbortController();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('gives up after 300 s of silence with MODEL_IDLE_TIMEOUT, aborting the provider call and releasing the hold', async () => {
    const upstream = installFetch();
    const call = start();
    await vi.advanceTimersByTimeAsync(0);
    upstream.send(thinkingFrame);

    await vi.advanceTimersByTimeAsync(299 * SECOND);
    expect(call.outcome().state).toBe('pending');
    await vi.advanceTimersByTimeAsync(2 * SECOND);

    expect(codeOf(call.outcome())).toBe('MODEL_IDLE_TIMEOUT');
    expect(upstream.providerSignal()?.aborted).toBe(true);
    expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'TIMEOUT');
    expect(access.finalizeCredit).not.toHaveBeenCalled();
  });

  it('treats a provider that never sends a first byte as stuck after 300 s', async () => {
    installFetch({ holdProviderHeaders: true });
    const call = start();

    await vi.advanceTimersByTimeAsync(301 * SECOND);

    expect(codeOf(call.outcome())).toBe('MODEL_IDLE_TIMEOUT');
    expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'TIMEOUT');
  });

  it('lets a model that keeps thinking run past 300 s in total, and settles its answer', async () => {
    const upstream = installFetch();
    const call = start();
    await vi.advanceTimersByTimeAsync(0);

    // A thinking frame every 250 s: never 300 s of silence, 500 s in all.
    for (let n = 0; n < 2; n++) {
      await vi.advanceTimersByTimeAsync(250 * SECOND);
      upstream.send(thinkingFrame);
    }
    expect(call.outcome().state).toBe('pending');
    for (const line of doneFrames) {
      upstream.send(line);
    }
    upstream.finish();
    await vi.advanceTimersByTimeAsync(0);

    const settled = call.outcome();
    expect(settled.state).toBe('resolved');
    expect(settled.state === 'resolved' && settled.value).toMatchObject({
      content: 'Final draft.',
    });
    expect(access.finalizeCredit).toHaveBeenCalledTimes(1);
    expect(access.releaseCredit).not.toHaveBeenCalled();
  });

  it('stops a call that never goes quiet at 600 s with MODEL_HARD_CEILING', async () => {
    const upstream = installFetch();
    const call = start();
    await vi.advanceTimersByTimeAsync(0);

    // A frame every 100 s: always alive, so only the ceiling can end it.
    for (let n = 0; n < 5; n++) {
      await vi.advanceTimersByTimeAsync(100 * SECOND);
      upstream.send(thinkingFrame);
    }
    expect(call.outcome().state).toBe('pending');
    await vi.advanceTimersByTimeAsync(101 * SECOND);

    expect(codeOf(call.outcome())).toBe('MODEL_HARD_CEILING');
    expect(upstream.providerSignal()?.aborted).toBe(true);
    expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'TIMEOUT');
  });

  it('aborts the provider call the moment the caller cancels, and settles what was already streamed', async () => {
    const upstream = installFetch();
    const call = start();
    await vi.advanceTimersByTimeAsync(0);
    upstream.send(thinkingFrame);
    await vi.advanceTimersByTimeAsync(40 * SECOND);

    caller.abort();
    // Well inside the 2 s the job is allowed to take to notice a cancel.
    await vi.advanceTimersByTimeAsync(100);

    expect(upstream.providerSignal()?.aborted).toBe(true);
    expect(codeOf(call.outcome())).toBe('CLIENT_ABORTED');
    // The provider already generated the thinking it streamed (ADR-175 addendum), so the hold is
    // settled on that estimate instead of being given back whole.
    expect(access.finalizeCredit).toHaveBeenCalledTimes(1);
    expect(access.releaseCredit).not.toHaveBeenCalled();
  });

  it('releases the hold as cancelled when the caller cancels before anything was streamed', async () => {
    const upstream = installFetch();
    const call = start();
    await vi.advanceTimersByTimeAsync(0);

    caller.abort();
    await vi.advanceTimersByTimeAsync(100);

    expect(upstream.providerSignal()?.aborted).toBe(true);
    expect(codeOf(call.outcome())).toBe('CLIENT_ABORTED');
    expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'CANCELLED');
    expect(access.finalizeCredit).not.toHaveBeenCalled();
  });

  it('leaves no timer running after any of the above', async () => {
    const upstream = installFetch();
    const call = start();
    await vi.advanceTimersByTimeAsync(0);
    for (const line of doneFrames) {
      upstream.send(line);
    }
    upstream.finish();
    await vi.advanceTimersByTimeAsync(0);

    expect(call.outcome().state).toBe('resolved');
    expect(vi.getTimerCount()).toBe(0);
  });
});
