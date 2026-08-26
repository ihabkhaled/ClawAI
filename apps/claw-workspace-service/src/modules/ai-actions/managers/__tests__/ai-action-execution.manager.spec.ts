import { AppConfig } from '../../../../app/config/app.config';
import {
  AiActionKind,
  AiActionMode,
  AiActionPrivacyClass,
} from '../../../../common/enums/ai-action-kind.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import * as cloudClient from '../../utilities/cloud-generation-client.utility';
import { AiActionExecutionManager } from '../ai-action-execution.manager';

const mockConfig = {
  CHAT_SERVICE_URL: 'http://chat-service:4002',
  OLLAMA_SERVICE_URL: 'http://ollama-service:4008',
  AI_ACTION_REQUEST_TIMEOUT_MS: 60_000,
};

const primaryModel = { provider: 'ANTHROPIC', model: 'claude-sonnet-4', displayName: 'Sonnet' };

function makeManager(
  opts: {
    fallbackChain?: (typeof primaryModel)[];
    mode?: AiActionMode;
  } = {},
): {
  manager: AiActionExecutionManager;
  router: { resolve: jest.Mock };
  resolver: { resolveDefaults: jest.Mock };
  automationPreferences: { fetchLearned: jest.Mock };
} {
  const router = {
    resolve: jest.fn().mockResolvedValue({
      mode: opts.mode ?? AiActionMode.MANUAL,
      primary: primaryModel,
      fallbackChain: opts.fallbackChain ?? [],
    }),
  };
  const resolver = {
    resolveDefaults: jest.fn().mockResolvedValue({ primary: null, fallbackChain: [] }),
  };
  const automationPreferences = { fetchLearned: jest.fn().mockResolvedValue([]) };
  const manager = new AiActionExecutionManager(
    router as never,
    resolver as never,
    automationPreferences as never,
  );
  return { manager, router, resolver, automationPreferences };
}

describe('AiActionExecutionManager.run', () => {
  let callSpy: jest.SpyInstance;

  beforeEach(() => {
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue(mockConfig as unknown as ReturnType<typeof AppConfig.get>);
    callSpy = jest.spyOn(cloudClient, 'callCloudGenerate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generates via the resolved primary model and returns the result', async () => {
    const { manager } = makeManager();
    callSpy.mockResolvedValue({ content: 'generated text', inputTokens: 10, outputTokens: 20 });

    const result = await manager.run({
      actionKind: AiActionKind.SUMMARIZE,
      privacyClass: AiActionPrivacyClass.PUBLIC,
      context: 'some content',
    });

    expect(result.content).toBe('generated text');
    expect(result.generatedBy.provider).toBe('ANTHROPIC');
  });

  it('does not fetch learned preferences when no userId is given', async () => {
    const { manager, automationPreferences } = makeManager();
    callSpy.mockResolvedValue({ content: 'ok' });

    await manager.run({
      actionKind: AiActionKind.SUMMARIZE,
      privacyClass: AiActionPrivacyClass.PUBLIC,
      context: 'ctx',
    });

    expect(automationPreferences.fetchLearned).not.toHaveBeenCalled();
  });

  it('fetches learned preferences for the given userId and actionKind, and injects them into the prompt', async () => {
    const { manager, automationPreferences } = makeManager();
    automationPreferences.fetchLearned.mockResolvedValue([
      {
        id: 'p1',
        content: 'User prefers concise drafts',
        type: 'PREFERENCE',
        createdAt: '',
        updatedAt: '',
      },
    ]);
    callSpy.mockResolvedValue({ content: 'ok' });

    await manager.run({
      actionKind: AiActionKind.DRAFT,
      privacyClass: AiActionPrivacyClass.PUBLIC,
      context: 'ctx',
      userId: 'user-1',
    });

    expect(automationPreferences.fetchLearned).toHaveBeenCalledWith(
      'user-1',
      AiActionKind.DRAFT,
      5,
    );
    const callArgs = callSpy.mock.calls[0]?.[0] as { systemPrompt: string };
    expect(callArgs.systemPrompt).toContain('User prefers concise drafts');
  });

  it('throws a BusinessException when every model in the attempt chain fails', async () => {
    const { manager } = makeManager();
    callSpy.mockRejectedValue(new Error('upstream 500'));

    await expect(
      manager.run({
        actionKind: AiActionKind.SUMMARIZE,
        privacyClass: AiActionPrivacyClass.PUBLIC,
        context: 'ctx',
      }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it('falls through to the next model in the fallback chain after the primary fails', async () => {
    const fallbackModel = { provider: 'OPENAI', model: 'gpt-4o', displayName: 'GPT-4o' };
    const { manager } = makeManager({ fallbackChain: [fallbackModel] });
    callSpy
      .mockRejectedValueOnce(new Error('primary down'))
      .mockResolvedValueOnce({ content: 'from fallback' });

    const result = await manager.run({
      actionKind: AiActionKind.SUMMARIZE,
      privacyClass: AiActionPrivacyClass.PUBLIC,
      context: 'ctx',
    });

    expect(result.content).toBe('from fallback');
    expect(result.generatedBy.provider).toBe('OPENAI');
  });
});
