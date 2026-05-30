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
      criticSummary: 'Critic flagged 1 issue.',
      criticRequested: true,
      criticParseFailed: false,
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

  it('renders the critic feedback list and summary when critic was requested', () => {
    render(<JudgeRefereeDetails message={message} />);
    fireEvent.click(screen.getByRole('button', { name: 'chat.judgeOpenReview' }));
    expect(screen.getByText('Critic flagged 1 issue.')).toBeInTheDocument();
    expect(screen.getByText('• Incomplete answer')).toBeInTheDocument();
  });

  it('renders the "not requested" message when criticRequested is false', () => {
    const messageNoCritic: ChatMessage = {
      ...message,
      metadata: {
        ...message.metadata,
        judgeReview: {
          ...(message.metadata as { judgeReview: Record<string, unknown> }).judgeReview,
          criticRequested: false,
          criticFeedback: [],
          criticSummary: '',
          criticParseFailed: false,
        },
      },
    };
    render(<JudgeRefereeDetails message={messageNoCritic} />);
    fireEvent.click(screen.getByRole('button', { name: 'chat.judgeOpenReview' }));
    expect(screen.getByText('compare.critic.notRequested')).toBeInTheDocument();
  });
});
