import { DeterministicGenerationError } from '../../generation/utilities/deterministic-generation.error';
import { ChatModelClient } from '../chat-model.client';
import { type ModelContextClient } from '../model-context.client';
import { AppConfig } from '../../../app/config/app.config';

const oversized = {
  ownerId: 'owner-1',
  requestId: 'job-1:judge:round-1',
  budgetId: 'budget-1',
  provider: 'OLLAMA',
  model: 'glm-5.3',
  systemPrompt: 'system',
  userPrompt: `evidence ${'x'.repeat(20_000)}`,
  maxOutputTokens: 4_096,
};

// chat-service answers the stream route with one result frame after any activity frames.
const resultStream = (data: Record<string, unknown>) =>
  new Response(
    `${JSON.stringify({ type: 'activity' })}
${JSON.stringify({ type: 'result', data })}
`,
    {
      status: 200,
    },
  );

describe('ChatModelClient', () => {
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

  it('uses the exact job budget and stable call id through the chat billing path', async () => {
    const modelContext = {
      getWindow: vi.fn().mockResolvedValue({ tokens: 128_000, source: 'known' }),
    } as unknown as ModelContextClient;
    const fetchMock = vi.fn().mockResolvedValue(
      resultStream({
        content: '{"draft":"ready"}',
        provider: 'OPENAI',
        model: 'gpt-5',
        durationMs: 10,
        clamped: false,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await new ChatModelClient(modelContext).generate({
      ownerId: 'owner-1',
      requestId: 'job-1:author-1:round-1',
      budgetId: 'budget-1',
      provider: 'OPENAI',
      model: 'gpt-5',
      systemPrompt: 'Use only supplied evidence.',
      userPrompt: 'Full source and evidence.',
      maxOutputTokens: 4_096,
    });

    expect(result.content).toContain('ready');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      userId: 'owner-1',
      requestId: 'job-1:author-1:round-1',
      threadJobBudgetId: 'budget-1',
      surface: 'THREADS',
    });
  });

  it('refuses an oversized complete prompt before calling the model', async () => {
    const modelContext = {
      getWindow: vi.fn().mockResolvedValue({ tokens: 4_097, source: 'known' }),
    } as unknown as ModelContextClient;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      new ChatModelClient(modelContext).generate({
        ownerId: 'owner-1',
        requestId: 'job-1:judge:round-1',
        budgetId: 'budget-1',
        provider: 'OPENAI',
        model: 'gpt-5',
        systemPrompt: 'system',
        userPrompt: `evidence ${'x'.repeat(20_000)}`,
        maxOutputTokens: 4_096,
      }),
    ).rejects.toThrow('Complete role context exceeds the model window');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('marks an overflow of a known window as a failure a retry cannot fix', async () => {
    const modelContext = {
      getWindow: vi.fn().mockResolvedValue({ tokens: 4_097, source: 'known' }),
    } as unknown as ModelContextClient;
    vi.stubGlobal('fetch', vi.fn());

    const failure = await new ChatModelClient(modelContext)
      .generate({ ...oversized })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(DeterministicGenerationError);
  });

  it('says the window was assumed when an unknown window cannot hold the prompt', async () => {
    const modelContext = {
      getWindow: vi.fn().mockResolvedValue({ tokens: 32_768, source: 'assumed' }),
    } as unknown as ModelContextClient;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const failure = await new ChatModelClient(modelContext)
      .generate({ ...oversized, userPrompt: `evidence ${'x'.repeat(140_000)}` })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(DeterministicGenerationError);
    expect(failure).toHaveProperty(
      'message',
      'Complete role context exceeds the assumed model window',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still calls the model when the prompt fits an assumed window, without truncating it', async () => {
    const modelContext = {
      getWindow: vi.fn().mockResolvedValue({ tokens: 32_768, source: 'assumed' }),
    } as unknown as ModelContextClient;
    const fetchMock = vi.fn().mockResolvedValue(
      resultStream({
        content: '{"draft":"ready"}',
        provider: 'OLLAMA',
        model: 'glm-5.3',
        durationMs: 10,
        clamped: false,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const userPrompt = `complete evidence ${'y'.repeat(2_000)}`;

    await new ChatModelClient(modelContext).generate({ ...oversized, userPrompt });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ userPrompt });
  });
});
