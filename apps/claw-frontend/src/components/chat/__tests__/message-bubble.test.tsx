import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageBubble } from '@/components/chat/message-bubble';
import { MessageRole, RoutingMode } from '@/enums';
import type { ChatMessage } from '@/types';

vi.mock('@/components/chat/file-generation-bubble', () => ({
  FileGenerationBubble: () => <div>file-generation</div>,
}));

vi.mock('@/components/chat/image-generation-bubble', () => ({
  ImageGenerationBubble: () => <div>image-generation</div>,
}));

vi.mock('@/components/chat/judge-referee-details', () => ({
  JudgeRefereeDetails: () => <div>judge-details</div>,
}));

vi.mock('@/components/chat/message-attachments', () => ({
  MessageAttachments: () => <div>attachments</div>,
}));

vi.mock('@/components/chat/message-provenance', () => ({
  MessageProvenance: () => <div>provenance</div>,
}));

vi.mock('@/components/chat/research-run-details', () => ({
  ResearchRunDetails: () => <div>research-details</div>,
}));

vi.mock('@/components/chat/routing-transparency', () => ({
  RoutingTransparency: () => <div>routing</div>,
}));

vi.mock('@/components/chat/context-receipt-button', () => ({
  ContextReceiptButton: () => <div>context-receipt</div>,
}));

vi.mock('@/lib/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

describe('MessageBubble', () => {
  it('renders a fallback message when assistant content is empty', () => {
    const message: ChatMessage = {
      id: 'msg-1',
      threadId: 'thread-1',
      role: MessageRole.ASSISTANT,
      content: '',
      provider: 'local-ollama',
      model: 'qwen3:1.7b',
      routingMode: RoutingMode.AUTO,
      routerModel: null,
      usedFallback: false,
      inputTokens: 12,
      outputTokens: 0,
      feedback: null,
      latencyMs: 1200,
      metadata: null,
      createdAt: '2026-04-21T12:00:00.000Z',
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText('chat.noVisibleAnswer')).toBeInTheDocument();
  });

  it('keeps compact route metadata while preserving detailed provenance', () => {
    const message: ChatMessage = {
      id: 'msg-2',
      threadId: 'thread-1',
      role: MessageRole.ASSISTANT,
      content: 'Here is the result.',
      provider: 'local-ollama',
      model: 'glm4:latest',
      routingMode: RoutingMode.AUTO,
      routerModel: 'qwen3:1.7b',
      usedFallback: false,
      inputTokens: 40,
      outputTokens: 12,
      feedback: null,
      latencyMs: 2200,
      metadata: {
        routeRoadmap: {
          routerModel: 'qwen3:1.7b',
          research: {
            workflow: 'SEARCH_FETCH_EXTRACT',
            itemCount: 3,
          },
          finalProvider: 'local-ollama',
          finalModel: 'glm-5.1:cloud',
        },
      },
      createdAt: '2026-04-21T12:00:00.000Z',
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText('local-ollama / glm-5.1:cloud')).toBeInTheDocument();
    expect(screen.getByText('Route: qwen3:1.7b -> glm-5.1:cloud')).toBeInTheDocument();
    expect(screen.getByText('Research: SEARCH_FETCH_EXTRACT (3 items)')).toBeInTheDocument();
    expect(screen.getByText('provenance')).toBeInTheDocument();
  });

  it('renders the context-exhausted banner when truncatedAtContextLimit is true', () => {
    const message: ChatMessage = {
      id: 'msg-3',
      threadId: 'thread-1',
      role: MessageRole.ASSISTANT,
      content: 'Partial answer cut off.',
      provider: 'local-ollama',
      model: 'qwen3:1.7b',
      routingMode: RoutingMode.AUTO,
      routerModel: null,
      usedFallback: false,
      inputTokens: 4000,
      outputTokens: 2000,
      feedback: null,
      latencyMs: 1500,
      metadata: { truncatedAtContextLimit: true },
      createdAt: '2026-04-21T12:00:00.000Z',
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText('chat.truncated.title')).toBeInTheDocument();
    expect(screen.getByText('chat.truncated.body')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does NOT render the context-exhausted banner when the flag is missing or false', () => {
    const messageWithoutFlag: ChatMessage = {
      id: 'msg-4',
      threadId: 'thread-1',
      role: MessageRole.ASSISTANT,
      content: 'Complete answer.',
      provider: 'local-ollama',
      model: 'qwen3:1.7b',
      routingMode: RoutingMode.AUTO,
      routerModel: null,
      usedFallback: false,
      inputTokens: 40,
      outputTokens: 12,
      feedback: null,
      latencyMs: 1500,
      metadata: null,
      createdAt: '2026-04-21T12:00:00.000Z',
    };

    const { rerender } = render(<MessageBubble message={messageWithoutFlag} />);

    expect(screen.queryByText('chat.truncated.title')).not.toBeInTheDocument();
    expect(screen.queryByText('chat.truncated.body')).not.toBeInTheDocument();

    const messageWithFalseFlag: ChatMessage = {
      ...messageWithoutFlag,
      id: 'msg-5',
      metadata: { truncatedAtContextLimit: false },
    };

    rerender(<MessageBubble message={messageWithFalseFlag} />);

    expect(screen.queryByText('chat.truncated.title')).not.toBeInTheDocument();
    expect(screen.queryByText('chat.truncated.body')).not.toBeInTheDocument();
  });
});
