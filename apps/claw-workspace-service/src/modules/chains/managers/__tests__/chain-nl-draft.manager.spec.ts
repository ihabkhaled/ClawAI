import { AppConfig } from '../../../../app/config/app.config';
import { BusinessException } from '../../../../common/errors/business.exception';
import * as cloudClient from '../../../ai-actions/utilities/cloud-generation-client.utility';
import { ChainNlDraftManager } from '../chain-nl-draft.manager';

const mockConfig = {
  CHAT_SERVICE_URL: 'http://chat-service:4002',
  OLLAMA_SERVICE_URL: 'http://ollama-service:4008',
  AI_ACTION_REQUEST_TIMEOUT_MS: 60_000,
};

const primaryModel = { provider: 'ANTHROPIC', model: 'claude-sonnet-4', displayName: 'Sonnet' };

function makeDeps(
  opts: {
    connectors?: Array<{ id: string; provider: string; encryptedTokens: string | null }>;
    primary?: typeof primaryModel | null;
    fallbackChain?: (typeof primaryModel)[];
  } = {},
): {
  manager: ChainNlDraftManager;
  connectorRepo: { findAllByUser: jest.Mock };
  modelResolver: { resolveDefaults: jest.Mock };
} {
  const connectors = opts.connectors ?? [
    { id: 'jira-1', provider: 'JIRA', encryptedTokens: 'enc' },
  ];
  const connectorRepo = {
    findAllByUser: jest.fn().mockResolvedValue({ data: connectors, total: connectors.length }),
  };
  const modelResolver = {
    resolveDefaults: jest.fn().mockResolvedValue({
      primary: opts.primary === undefined ? primaryModel : opts.primary,
      fallbackChain: opts.fallbackChain ?? [],
    }),
  };
  const manager = new ChainNlDraftManager(connectorRepo as never, modelResolver as never);
  return { manager, connectorRepo, modelResolver };
}

describe('ChainNlDraftManager.draft', () => {
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

  it('returns the parsed dsl when the model responds with valid JSON on the first try', async () => {
    const { manager } = makeDeps();
    callSpy.mockResolvedValue({
      content: JSON.stringify({
        steps: [{ id: 's1', connectorId: 'jira-1', actionType: 'CREATE_TICKET', payload: {} }],
      }),
    });

    const dsl = await manager.draft('u1', 'file a jira ticket');

    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(dsl.steps).toHaveLength(1);
    expect(dsl.steps[0]?.connectorId).toBe('jira-1');
  });

  it('strips a markdown code fence before parsing', async () => {
    const { manager } = makeDeps();
    callSpy.mockResolvedValue({
      content:
        '```json\n{"steps":[{"id":"s1","connectorId":"jira-1","actionType":"CREATE_TICKET","payload":{}}]}\n```',
    });

    const dsl = await manager.draft('u1', 'file a jira ticket');

    expect(dsl.steps).toHaveLength(1);
  });

  it('accepts an empty steps array as a valid "nothing matched" response', async () => {
    const { manager } = makeDeps();
    callSpy.mockResolvedValue({ content: '{"steps":[]}' });

    const dsl = await manager.draft('u1', 'do something unrelated to any connector');

    expect(dsl.steps).toEqual([]);
  });

  it('retries once on the same model with the parse error appended, then succeeds', async () => {
    const { manager } = makeDeps();
    callSpy.mockResolvedValueOnce({ content: 'not json at all' }).mockResolvedValueOnce({
      content: JSON.stringify({
        steps: [{ id: 's1', connectorId: 'jira-1', actionType: 'CREATE_TICKET', payload: {} }],
      }),
    });

    const dsl = await manager.draft('u1', 'file a jira ticket');

    expect(callSpy).toHaveBeenCalledTimes(2);
    expect(dsl.steps).toHaveLength(1);
    const secondCallArgs = callSpy.mock.calls[1]?.[0] as { userPrompt: string };
    expect(secondCallArgs.userPrompt).toContain('not valid JSON');
  });

  it("rejects a connectorId the model invented (not one of the caller's connectors)", async () => {
    const { manager } = makeDeps();
    callSpy.mockResolvedValue({
      content: JSON.stringify({
        steps: [{ id: 's1', connectorId: 'made-up', actionType: 'CREATE_TICKET', payload: {} }],
      }),
    });

    await expect(manager.draft('u1', 'file a jira ticket')).rejects.toBeInstanceOf(
      BusinessException,
    );
    // 1 primary attempt x MAX_NL_DRAFT_ATTEMPTS_PER_MODEL retries, no fallback models configured
    expect(callSpy).toHaveBeenCalledTimes(2);
  });

  it('throws CHAIN_NL_DRAFT_FAILED after exhausting all attempts on all models', async () => {
    const { manager } = makeDeps();
    callSpy.mockResolvedValue({ content: 'garbage' });

    await expect(manager.draft('u1', 'file a jira ticket')).rejects.toMatchObject({
      code: 'CHAIN_NL_DRAFT_FAILED',
    });
  });

  it('throws NO_CONNECTORS when the caller has no authenticated connectors', async () => {
    const { manager } = makeDeps({ connectors: [] });

    await expect(manager.draft('u1', 'file a jira ticket')).rejects.toMatchObject({
      code: 'NO_CONNECTORS',
    });
    expect(callSpy).not.toHaveBeenCalled();
  });

  it('ignores connectors with no stored tokens (unauthenticated)', async () => {
    const { manager } = makeDeps({
      connectors: [{ id: 'jira-1', provider: 'JIRA', encryptedTokens: null }],
    });

    await expect(manager.draft('u1', 'file a jira ticket')).rejects.toMatchObject({
      code: 'NO_CONNECTORS',
    });
  });

  it('throws NO_MODEL_AVAILABLE when the resolver has no default model', async () => {
    const { manager } = makeDeps({ primary: null });

    await expect(manager.draft('u1', 'file a jira ticket')).rejects.toMatchObject({
      code: 'NO_MODEL_AVAILABLE',
    });
    expect(callSpy).not.toHaveBeenCalled();
  });

  it('falls through to the next model in the fallback chain after exhausting the primary', async () => {
    const fallbackModel = { provider: 'OPENAI', model: 'gpt-4o', displayName: 'GPT-4o' };
    const { manager } = makeDeps({ fallbackChain: [fallbackModel] });
    callSpy
      .mockResolvedValueOnce({ content: 'garbage' })
      .mockResolvedValueOnce({ content: 'garbage' })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          steps: [{ id: 's1', connectorId: 'jira-1', actionType: 'CREATE_TICKET', payload: {} }],
        }),
      });

    const dsl = await manager.draft('u1', 'file a jira ticket');

    expect(callSpy).toHaveBeenCalledTimes(3);
    expect(dsl.steps).toHaveLength(1);
    expect(callSpy.mock.calls[2]?.[0]).toMatchObject({ provider: 'OPENAI', model: 'gpt-4o' });
  });
});
