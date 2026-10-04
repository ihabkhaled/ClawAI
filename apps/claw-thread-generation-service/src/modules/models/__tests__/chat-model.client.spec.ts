import { ChatModelClient } from '../chat-model.client';
import { type ModelContextClient } from '../model-context.client';
import { AppConfig } from '../../../app/config/app.config';

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
      getWindow: vi.fn().mockResolvedValue(128_000),
    } as unknown as ModelContextClient;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: '{"draft":"ready"}',
          provider: 'OPENAI',
          model: 'gpt-5',
          durationMs: 10,
          clamped: false,
        }),
        { status: 200 },
      ),
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
      getWindow: vi.fn().mockResolvedValue(4_097),
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
});
