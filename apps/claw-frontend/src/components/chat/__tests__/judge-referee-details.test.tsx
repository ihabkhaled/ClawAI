import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JudgeRefereeDetails } from '@/components/chat/judge-referee-details';
import { MessageRole, RoutingMode } from '@/enums';
import type { ChatMessage } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

const message: ChatMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  role: MessageRole.ASSISTANT,
  content: 'Original answer',
  provider: 'local-ollama',
  model: 'qwen3:1.7b',
  routingMode: RoutingMode.AUTO,
  routerModel: null,
  usedFallback: false,
  inputTokens: 10,
  outputTokens: 10,
  feedback: null,
  latencyMs: 900,
  createdAt: '2026-04-23T12:00:00.000Z',
  metadata: {
    judgeReview: {
      version: 1,
      judgeDecision: 'ESCALATE',
      judgeModel: 'local-ollama/qwen3:1.7b',
      judgeDisplayName: 'local-ollama/qwen3:1.7b',
      judgeConfidence: 0.91,
      judgeReasoning: 'The original answer was incomplete.',
      judgeSummary: 'The answer required escalation.',
      judgeResponse: 'Here is a stronger answer.',
      judgeResponseType: 'escalated_answer',
      criticModel: 'OPENAI/gpt-4o-mini',
      criticDisplayName: 'OPENAI/gpt-4o-mini',
      criticFeedback: ['Incomplete answer'],
      criticScore: 0.4,
      originalExecutionModel: 'local-ollama/qwen3:1.7b',
      originalExecutionDisplayName: 'local-ollama/qwen3:1.7b',
      originalAnswerSnapshot: 'Original answer',
      revisedAnswer: null,
      escalatedAnswer: 'Here is a stronger answer.',
      judgeLatencyMs: 200,
      criticLatencyMs: 100,
      judgeTotalLatencyMs: 300,
      judgeMetadata: {
        category: 'coding',
        recommendedChanges: ['Answer directly'],
      },
      judgeDialogAvailable: true,
      generatedAt: '2026-04-23T12:00:00.000Z',
    },
  },
};

describe('JudgeRefereeDetails', () => {
  it('opens the review dialog and renders key review sections', () => {
    render(<JudgeRefereeDetails message={message} />);

    fireEvent.click(screen.getByRole('button', { name: 'chat.judgeOpenReview' }));

    expect(screen.getByText('chat.judgeReviewTitle')).toBeInTheDocument();
    expect(screen.getAllByText('The answer required escalation.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Here is a stronger answer.').length).toBeGreaterThan(0);
    expect(screen.getByText(/Answer directly/)).toBeInTheDocument();
  });
});
