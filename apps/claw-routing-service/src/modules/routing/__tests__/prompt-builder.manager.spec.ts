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
});
