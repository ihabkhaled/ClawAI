import { describe, expect, it } from 'vitest';

import { CompareJudgeState, MessageRole, ParallelModelStatus, RoutingMode } from '@/enums';
import type { ChatMessage } from '@/types';
import { messageToParallelResponse } from '@/utilities';

const baseMessage: ChatMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  role: MessageRole.ASSISTANT,
  content: 'Original answer',
  provider: 'ANTHROPIC',
  model: 'claude-sonnet-4',
  routingMode: RoutingMode.MANUAL_MODEL,
  routerModel: null,
  usedFallback: false,
  inputTokens: 42,
  outputTokens: 84,
  feedback: null,
  latencyMs: 1200,
  metadata: null,
  createdAt: '2026-04-23T12:00:00.000Z',
};

describe('messageToParallelResponse', () => {
  it('maps verified judge metadata into the parallel response', () => {
    const response = messageToParallelResponse({
      ...baseMessage,
      metadata: {
        parallelExecution: true,
        status: ParallelModelStatus.COMPLETED,
        judgeEnabled: true,
        judgeModel: 'local-ollama/qwen3:1.7b',
        judgeDisplayName: 'Judge model',
        judgeState: CompareJudgeState.VERIFIED,
        judgeDialogAvailable: true,
        judgeReview: {
          version: 1,
          judgeDecision: 'ACCEPT',
          judgeModel: 'local-ollama/qwen3:1.7b',
          judgeDisplayName: 'Judge model',
          judgeConfidence: 0.92,
          judgeReasoning: 'The answer is sound.',
          judgeSummary: 'Verified.',
          judgeResponse: 'Verified response.',
          judgeResponseType: 'verification_note',
          criticModel: 'OPENAI/gpt-4o-mini',
          criticDisplayName: 'Critic model',
          criticFeedback: [],
          criticScore: 0.98,
          originalExecutionModel: 'ANTHROPIC/claude-sonnet-4',
          originalExecutionDisplayName: 'ANTHROPIC/claude-sonnet-4',
          originalAnswerSnapshot: 'Original answer',
          revisedAnswer: null,
          escalatedAnswer: null,
          judgeLatencyMs: 250,
          criticLatencyMs: 180,
          judgeTotalLatencyMs: 430,
          judgeMetadata: {
            category: 'general',
            recommendedChanges: [],
          },
          judgeDialogAvailable: true,
          generatedAt: '2026-04-23T12:05:00.000Z',
        },
      },
    });

    expect(response.judgeEnabled).toBe(true);
    expect(response.judgeState).toBe(CompareJudgeState.VERIFIED);
    expect(response.judgeErrorState).toBeNull();
    expect(response.judgeDialogAvailable).toBe(true);
    expect(response.judgeReview?.judgeDecision).toBe('ACCEPT');
    expect(response.message?.id).toBe('msg-1');
  });

  it('falls back to skipped error state when judge metadata is unavailable', () => {
    const response = messageToParallelResponse({
      ...baseMessage,
      metadata: {
        parallelExecution: true,
        status: ParallelModelStatus.FAILED,
        judgeEnabled: true,
        judgeErrorState: CompareJudgeState.UNAVAILABLE,
      },
    });

    expect(response.judgeEnabled).toBe(true);
    expect(response.judgeState).toBe(CompareJudgeState.SKIPPED);
    expect(response.judgeErrorState).toBe(CompareJudgeState.UNAVAILABLE);
    expect(response.judgeDialogAvailable).toBe(false);
  });
});
