import { PromptBuilderManager } from '../managers/prompt-builder.manager';

describe('PromptBuilderManager', () => {
  let manager: PromptBuilderManager;

  beforeEach(() => {
    manager = new PromptBuilderManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds local model intelligence and routing signals to the prompt', async () => {
    jest.spyOn(manager, 'fetchInstalledModels').mockResolvedValue([
      {
        name: 'qwen3',
        tag: '1.7b',
        category: 'general',
        roles: ['ROUTER'],
        capabilities: ['text'],
        parameterCount: '1.7B',
      },
      {
        name: 'tiny-chat',
        tag: 'latest',
        category: 'general',
        roles: ['LOCAL_FALLBACK_CHAT'],
        capabilities: ['chat'],
        parameterCount: '3B',
        sizeBytes: 2_400_000_000,
      },
      {
        name: 'coder',
        tag: 'latest',
        category: 'coding',
        roles: ['LOCAL_CODING'],
        capabilities: ['code_generation'],
        parameterCount: '7B',
        sizeBytes: 8_000_000_000,
      },
    ]);

    const prompt = await manager.buildRouterPrompt(['local-ollama', 'OPENAI'], {
      providerLatencyMs: { OPENAI: 1200, ANTHROPIC: 2400 },
      providerCircuitOpenUntil: { OPENAI: Date.now() + 60_000 },
      localDegradeLatencyMs: 18_000,
      latencyPenaltyStepMs: 6_000,
    });

    expect(prompt).toContain('MODEL INTELLIGENCE');
    expect(prompt).toContain('tiny-chat:latest');
    expect(prompt).toContain('LOCAL_FALLBACK_CHAT');
    expect(prompt).toContain('coder:latest');
    expect(prompt).toContain('LOCAL_CODING');
    expect(prompt).toContain('inferred=general_chat, summarization, drafting');
    expect(prompt).toContain('size=small');
    expect(prompt).toContain('size=medium');
    expect(prompt).toContain('ROUTER TRAINING EXAMPLES');
    expect(prompt).toContain('Create a PDF brief for this summary');
    expect(prompt).toContain('ROUTING SIGNALS');
    expect(prompt).toContain('OPENAI=1200');
    expect(prompt).toContain('open circuits');
    expect(prompt).not.toContain('- local-ollama / qwen3:1.7b');
  });

  it('keeps the no-model fallback explicit', async () => {
    jest.spyOn(manager, 'fetchInstalledModels').mockResolvedValue([]);

    const prompt = await manager.buildRouterPrompt(['OPENAI']);

    expect(prompt).toContain('No local execution models detected');
    expect(prompt).toContain('No execution model available');
  });

  it('adds learned routing priors from recent decisions', async () => {
    const adaptiveInsights = {
      windowDays: 30,
      totalDecisions: 12,
      avgConfidence: 0.81,
      topReasonTags: ['auto', 'category_detected', 'privacy_enforced'],
      providerInsights: [
        {
          provider: 'ANTHROPIC',
          totalDecisions: 5,
          fallbackCount: 1,
          fallbackRate: 0.2,
          avgConfidence: 0.88,
          topModes: ['AUTO', 'HIGH_REASONING'],
        },
        {
          provider: 'local-ollama',
          totalDecisions: 7,
          fallbackCount: 0,
          fallbackRate: 0,
          avgConfidence: 0.79,
          topModes: ['AUTO', 'LOCAL_ONLY'],
        },
      ],
      modeInsights: [
        { routingMode: 'AUTO', count: 9, percentage: 0.75, avgConfidence: 0.82 },
        { routingMode: 'LOCAL_ONLY', count: 3, percentage: 0.25, avgConfidence: 0.78 },
      ],
    };

    const adaptiveLearningManager = {
      computeInsights: jest.fn().mockResolvedValue(adaptiveInsights),
    };

    const managerWithInsights = new PromptBuilderManager(adaptiveLearningManager as never);

    jest.spyOn(managerWithInsights, 'fetchInstalledModels').mockResolvedValue([]);

    const prompt = await managerWithInsights.buildRouterPrompt(['OPENAI']);

    expect(prompt).toContain('LEARNED ROUTING PRIORS');
    expect(prompt).toContain('weight=0.70');
    expect(prompt).toContain('fallbackRate=0.20');
    expect(prompt).toContain('avgConfidence=0.88');
    expect(prompt).toContain('AUTO: 9');
    expect(prompt).toContain('topTags=auto, category_detected, privacy_enforced');
    expect(prompt).toContain('CONNECTOR PRIORS');
    expect(prompt).toContain('ANTHROPIC: status=unhealthy');
    expect(prompt).toContain('OPENAI: status=healthy');
    expect(adaptiveLearningManager.computeInsights).toHaveBeenCalledWith(30);
  });
});
