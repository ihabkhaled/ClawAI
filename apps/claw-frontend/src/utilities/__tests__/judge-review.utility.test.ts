import { describe, expect, it } from 'vitest';

import { MessageRole, RoutingMode } from '@/enums';
import type { ChatMessage } from '@/types';
import { getJudgeReviewFromMessage } from '@/utilities';

const baseMessage: ChatMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  role: MessageRole.ASSISTANT,
  content: 'Original answer',
  provider: 'local-ollama',
  model: 'qwen3:1.7b',
  routingMode: RoutingMode.AUTO,
  routerModel: null,
  usedFallback: false,
  inputTokens: 20,
  outputTokens: 10,
  feedback: null,
  latencyMs: 1200,
  metadata: null,
  createdAt: '2026-04-23T12:00:00.000Z',
};

describe('getJudgeReviewFromMessage', () => {
  it('parses the nested judge review payload', () => {
    const review = getJudgeReviewFromMessage({
      ...baseMessage,
      metadata: {
        judgeReview: {
          version: 1,
          judgeDecision: 'REVISE',
          judgeModel: 'local-ollama/qwen3:1.7b',
          judgeDisplayName: 'local-ollama/qwen3:1.7b',
          judgeConfidence: 0.81,
          judgeReasoning: 'Needs one more edge case.',
          judgeSummary: 'Mostly good, but revise.',
          judgeResponse: 'Add handling for invalid input.',
          judgeResponseType: 'revised_answer',
          criticModel: 'OPENAI/gpt-4o-mini',
          criticDisplayName: 'OPENAI/gpt-4o-mini',
          criticFeedback: ['Missing invalid input handling'],
          criticScore: 0.62,
          originalExecutionModel: 'local-ollama/qwen3:1.7b',
          originalExecutionDisplayName: 'local-ollama/qwen3:1.7b',
          originalAnswerSnapshot: 'Original answer',
          revisedAnswer: 'Revised answer',
          escalatedAnswer: null,
          judgeLatencyMs: 800,
          criticLatencyMs: 400,
          judgeTotalLatencyMs: 1200,
          judgeMetadata: {
            category: 'coding',
            recommendedChanges: ['Validate inputs'],
          },
          judgeDialogAvailable: true,
          generatedAt: '2026-04-23T12:00:00.000Z',
        },
      },
    });

    expect(review?.judgeDecision).toBe('REVISE');
    expect(review?.revisedAnswer).toBe('Revised answer');
    expect(review?.judgeMetadata.recommendedChanges).toEqual(['Validate inputs']);
  });

  it('falls back to legacy flat metadata', () => {
    const review = getJudgeReviewFromMessage({
      ...baseMessage,
      metadata: {
        judgeDecision: 'ACCEPT',
        judgeModel: 'local-ollama/qwen3:1.7b',
        judgeReasoning: 'Looks good.',
        judgeConfidence: 0.9,
        criticModel: 'OPENAI/gpt-4o-mini',
        criticFeedback: ['No issues'],
        criticScore: 0.95,
        judgeTotalLatencyMs: 300,
      },
    });

    expect(review?.judgeDecision).toBe('ACCEPT');
    expect(review?.judgeResponse).toBe('Looks good.');
    expect(review?.originalAnswerSnapshot).toBe('Original answer');
  });
});
