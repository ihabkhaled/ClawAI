import { TokenLedgerContext, TokenUsageSource } from '@claw/shared-types';

import { JudgeRefereeManager } from '../managers/judge-referee.manager';
import { JudgeDecision } from '../../../common/enums';
import type { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse, MessageRoutedData, ThreadSettings } from '../types/execution.types';
import type { JudgeRefereeConfig } from '../types/judge-referee.types';
import {
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../utilities/assembled-context.utility';

function makeContext(): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [
      { role: 'USER', content: 'What is 2 + 2?' } as AssembledContext['threadMessages'][0],
    ],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    tokenBudget: 4000,
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
  };
}

function makeOriginalResponse(): LlmResponse {
  return {
    content: '4',
    provider: 'OPENAI',
    model: 'gpt-4o-mini',
    latencyMs: 100,
    usedFallback: false,
  };
}

function makePayload(): MessageRoutedData {
  return {
    messageId: 'msg-1',
    threadId: 'thread-1',
    selectedProvider: 'OPENAI',
    selectedModel: 'gpt-4o-mini',
    routingMode: 'MANUAL_MODEL',
    timestamp: new Date().toISOString(),
    judgeEnabled: true,
  };
}

const acceptVerdictJson = JSON.stringify({
  decision: 'ACCEPT',
  summary: 'Looks good.',
  reasoning: 'Correct and complete.',
  confidence: 0.9,
  responseType: 'verification_note',
  response: 'The answer passed review.',
  recommendedChanges: [],
});

const criticJson = JSON.stringify({ feedback: [], score: 0.95 });

describe('JudgeRefereeManager — cloud judge + token capture', () => {
  let manager: JudgeRefereeManager;
  let callProvider: jest.Mock;
  let chatStream: Partial<Record<keyof ChatStreamService, jest.Mock>>;
  let localSelection: Partial<Record<keyof LocalModelSelectionService, jest.Mock>>;

  // Critic + judge are both exercised here so the "cloud judge + token
  // capture" assertions can verify the combined ledger entry. criticEnabled
  // must be true (post-allowCriticReview flagship) for the critic LLM call to
  // happen; otherwise callProvider only fires once (judge only).
  const config: JudgeRefereeConfig = {
    enabled: true,
    category: undefined,
    routingMode: 'MANUAL_MODEL',
    isLocalOnly: false,
    criticEnabled: true,
    criticModel: 'GEMINI:gemini-2.5-flash',
  };

  beforeEach(() => {
    callProvider = jest.fn();
    chatStream = { emitJudgeEvaluating: jest.fn(), emitOrchestrationStage: jest.fn() };
    localSelection = { resolveDefaultModel: jest.fn().mockResolvedValue('gemma3:4b') };

    manager = new JudgeRefereeManager(
      chatStream as unknown as ChatStreamService,
      localSelection as unknown as LocalModelSelectionService,
    );
    manager.setExecutionManager({
      callProvider,
    } as unknown as ChatExecutionManager);
  });

  it('routes a user-chosen cloud judge model through callProvider with the JUDGE context', async () => {
    // critic call (cloud) then judge call (cloud)
    callProvider
      .mockResolvedValueOnce({
        content: criticJson,
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        latencyMs: 50,
        usedFallback: false,
        inputTokens: 30,
        outputTokens: 10,
        tokenEstimated: false,
        tokenSource: TokenUsageSource.NATIVE,
      } as LlmResponse)
      .mockResolvedValueOnce({
        content: acceptVerdictJson,
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 60,
        usedFallback: false,
        inputTokens: 40,
        outputTokens: 20,
        tokenEstimated: false,
        tokenSource: TokenUsageSource.NATIVE,
      } as LlmResponse);

    const threadSettings: ThreadSettings = { judgeModel: 'OPENAI:gpt-4o-mini' };
    const result = await manager.evaluate(
      makeOriginalResponse(),
      makeContext(),
      config,
      makePayload(),
      threadSettings,
    );

    expect(result.judgeVerdict.decision).toBe(JudgeDecision.ACCEPT);

    // The judge call (second callProvider invocation) targeted the cloud model
    // and was tagged JUDGE.
    const judgeCall = callProvider.mock.calls[1];
    expect(judgeCall[0]).toBe('OPENAI');
    expect(judgeCall[1]).toBe('gpt-4o-mini');
    expect(judgeCall[8]).toBe(TokenLedgerContext.JUDGE);

    // The critic call was also tagged JUDGE.
    expect(callProvider.mock.calls[0][8]).toBe(TokenLedgerContext.JUDGE);
  });

  it('combines critic + judge token usage and exposes it via buildMetadata', async () => {
    callProvider
      .mockResolvedValueOnce({
        content: criticJson,
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        latencyMs: 50,
        usedFallback: false,
        inputTokens: 30,
        outputTokens: 10,
        tokenEstimated: true,
        tokenSource: TokenUsageSource.ESTIMATED,
      } as LlmResponse)
      .mockResolvedValueOnce({
        content: acceptVerdictJson,
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 60,
        usedFallback: false,
        inputTokens: 40,
        outputTokens: 20,
        tokenEstimated: false,
        tokenSource: TokenUsageSource.NATIVE,
      } as LlmResponse);

    const result = await manager.evaluate(
      makeOriginalResponse(),
      makeContext(),
      config,
      makePayload(),
      { judgeModel: 'OPENAI:gpt-4o-mini' },
    );

    expect(result.tokenUsage).toEqual({
      inputTokens: 70,
      outputTokens: 30,
      estimated: true,
      source: TokenUsageSource.MIXED,
    });

    const metadata = manager.buildMetadata(result);
    expect(metadata.judgeInputTokens).toBe(70);
    expect(metadata.judgeOutputTokens).toBe(30);
    expect(metadata.judgeTokenEstimated).toBe(true);
    expect(metadata.judgeTokenSource).toBe(TokenUsageSource.MIXED);
  });

  it('keeps local-first behavior when judge model is AUTO', async () => {
    callProvider
      .mockResolvedValueOnce({
        content: criticJson,
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        latencyMs: 50,
        usedFallback: false,
      } as LlmResponse)
      .mockResolvedValueOnce({
        content: acceptVerdictJson,
        provider: 'local-ollama',
        model: 'gemma3:4b',
        latencyMs: 60,
        usedFallback: false,
      } as LlmResponse);

    await manager.evaluate(makeOriginalResponse(), makeContext(), config, makePayload(), {
      judgeModel: 'AUTO',
    });

    const judgeCall = callProvider.mock.calls[1];
    expect(judgeCall[0]).toBe('local-ollama');
    expect(judgeCall[1]).toBe('gemma3:4b');
  });

  it('routes a plain local model name through local-ollama', async () => {
    callProvider
      .mockResolvedValueOnce({
        content: criticJson,
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        latencyMs: 50,
        usedFallback: false,
      } as LlmResponse)
      .mockResolvedValueOnce({
        content: acceptVerdictJson,
        provider: 'local-ollama',
        model: 'phi4-mini',
        latencyMs: 60,
        usedFallback: false,
      } as LlmResponse);

    await manager.evaluate(makeOriginalResponse(), makeContext(), config, makePayload(), {
      judgeModel: 'phi4-mini',
    });

    const judgeCall = callProvider.mock.calls[1];
    expect(judgeCall[0]).toBe('local-ollama');
    expect(judgeCall[1]).toBe('phi4-mini');
  });

  it('does not crash the flow when the judge call fails (judge-failed fallback)', async () => {
    callProvider
      .mockResolvedValueOnce({
        content: criticJson,
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        latencyMs: 50,
        usedFallback: false,
      } as LlmResponse)
      .mockRejectedValueOnce(new Error('cloud judge 500'));

    const result = await manager.evaluate(
      makeOriginalResponse(),
      makeContext(),
      config,
      makePayload(),
      {
        judgeModel: 'OPENAI:gpt-4o-mini',
      },
    );

    expect(result.judgeVerdict.wasFallback).toBe(true);
    expect(result.judgeVerdict.fallbackState).toBe('unavailable');
    expect(result.judgeVerdict.decision).toBe(JudgeDecision.ACCEPT);
  });
});
