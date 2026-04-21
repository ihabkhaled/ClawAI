import { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { AssembledContext } from '../types/context.types';

describe('ContextAssemblyManager', () => {
  const manager = new ContextAssemblyManager();

  const buildContext = (): AssembledContext => ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'USER',
        content: 'Find the latest Windows 11 24H2 issues.',
        provider: null,
        model: null,
        routingMode: null,
        routerModel: null,
        usedFallback: false,
        inputTokens: null,
        outputTokens: null,
        estimatedCost: null,
        latencyMs: null,
        feedback: null,
        metadata: null,
        createdAt: new Date('2026-04-21T06:00:00.000Z'),
      },
    ],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: 'run-1',
    researchWarnings: [
      'Search results were withheld because the returned pages were too weakly matched to the request.',
    ],
    tokenBudget: 512,
  });

  it('includes research warnings even when no evidence items survive filtering', () => {
    const prompt = manager.buildPromptString(buildContext());

    expect(prompt).toContain('No reliable search evidence passed relevance validation');
    expect(prompt).toContain('Do not invent facts');
    expect(prompt).toContain('WARNINGS:');
    expect(prompt).toContain('too weakly matched');
  });
});
