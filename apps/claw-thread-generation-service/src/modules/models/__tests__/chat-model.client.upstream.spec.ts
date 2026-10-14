import { AppConfig } from '../../../app/config/app.config';
import { parseStepError } from '../../generation/utilities/parse-step-error.utility';
import { ChatModelClient, type ChatModelRequest } from '../chat-model.client';
import { ChatUpstreamError, findUpstreamError } from '../chat-upstream.error';
import { type ModelContextClient } from '../model-context.client';

const request: ChatModelRequest = {
  ownerId: 'owner-1',
  requestId: 'job-1:author-1:round-1',
  budgetId: 'budget-1',
  provider: 'GROQ',
  model: 'llama',
  systemPrompt: 'system',
  userPrompt: 'user',
  maxOutputTokens: 1_024,
};

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

const errorFrame = (frame: Record<string, unknown>): Response =>
  new Response(`${JSON.stringify({ type: 'error', ...frame })}\n`, { status: 200 });

describe('ChatModelClient error frames carry what the gateway said (ADR-181)', () => {
  beforeEach(() => {
    vi.stubEnv('THREAD_GENERATION_DATABASE_URL', 'postgresql://claw:secret@localhost:5432/db');
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(40));
    vi.stubEnv('CHAT_SERVICE_URL', 'http://chat-service:4002');
    AppConfig.validate();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('keeps the redacted message and the machine code, and the status and code still parse', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        errorFrame({
          status: 413,
          code: 'PROVIDER_REQUEST_TOO_LARGE',
          message: 'Request too large for this model tier.',
        }),
      ),
    );

    const failure = await failureOf(client().generate(request));

    expect(failure).toBeInstanceOf(ChatUpstreamError);
    expect(findUpstreamError(failure)?.upstreamMessage).toBe(
      'Request too large for this model tier.',
    );
    expect(parseStepError(failure)).toEqual({
      code: 'PROVIDER_REQUEST_TOO_LARGE',
      httpStatus: 413,
    });
  });

  it('reads Retry-After seconds as milliseconds', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          errorFrame({ status: 429, code: 'PROVIDER_RATE_LIMITED', retryAfterSeconds: 7 }),
        ),
    );

    const failure = await failureOf(client().generate(request));

    expect(findUpstreamError(failure)?.retryAfterMs).toBe(7000);
  });

  it('drops a message longer than 300 characters and a negative Retry-After instead of failing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        errorFrame({
          status: 500,
          code: 'PROVIDER_ERROR',
          message: 'x'.repeat(301),
          retryAfterSeconds: -1,
        }),
      ),
    );

    const failure = await failureOf(client().generate(request));

    expect(findUpstreamError(failure)).toMatchObject({ upstreamMessage: null, retryAfterMs: null });
    expect(parseStepError(failure).httpStatus).toBe(500);
  });

  it('finds the upstream error through a wrapper', () => {
    const inner = new ChatUpstreamError('Chat model request failed (429)', null, 100);
    expect(findUpstreamError(new Error('wrapped', { cause: inner }))).toBe(inner);
    expect(findUpstreamError(new Error('plain'))).toBeUndefined();
  });
});
