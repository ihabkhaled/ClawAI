import { AppConfig } from '../../../app/config/app.config';
import { ChatModelClient } from '../chat-model.client';
import { ChatModelIncompleteError } from '../chat-model-incomplete.error';
import { type ModelContextClient } from '../model-context.client';

const request = {
  ownerId: 'owner-1',
  requestId: 'job-1:author-1:round-1',
  budgetId: 'budget-1',
  provider: 'GEMINI',
  model: 'gemini-2.5-flash',
  systemPrompt: 'system',
  userPrompt: 'user',
  maxOutputTokens: 1_024,
};

// chat-service answers the stream route with one terminal result frame.
const reply = (body: Record<string, unknown>) =>
  new Response(
    `${JSON.stringify({
      type: 'result',
      data: {
        content: '{"a":1}',
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        durationMs: 10,
        clamped: false,
        ...body,
      },
    })}
`,
    { status: 200 },
  );

function client(): ChatModelClient {
  const modelContext = {
    getWindow: vi.fn().mockResolvedValue({ tokens: 128_000, source: 'known' }),
  } as unknown as ModelContextClient;
  return new ChatModelClient(modelContext);
}

describe('ChatModelClient spend', () => {
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

  it('passes the settled integer micro-USD cost through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ costMicroUsd: 1_234 })));

    await expect(client().generate(request)).resolves.toMatchObject({ costMicroUsd: 1_234 });
  });

  it('leaves the cost absent when the gateway reports none', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({})));

    const result = await client().generate(request);

    expect(result.costMicroUsd).toBeUndefined();
  });

  it.each([[1.5], [-1], ['12'], [Number.MAX_SAFE_INTEGER + 2]])(
    'refuses %s as a cost rather than storing a float or a negative',
    async (cost) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ costMicroUsd: cost })));

      const failure = await client()
        .generate(request)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ChatModelIncompleteError);
      expect(failure).toHaveProperty('costMicroUsd', 0);
    },
  );

  it('carries the cost on a reply cut short by the balance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ clamped: true, costMicroUsd: 90 })));

    const failure = await client()
      .generate(request)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ChatModelIncompleteError);
    expect(failure).toHaveProperty('costMicroUsd', 90);
    expect(failure).toHaveProperty('message', 'Chat model response was incomplete');
  });

  it('carries the cost on a reply with empty content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ content: '', costMicroUsd: 15 })));

    const failure = await client()
      .generate(request)
      .catch((error: unknown) => error);

    expect(failure).toHaveProperty('costMicroUsd', 15);
  });
});
