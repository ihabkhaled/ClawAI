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

vi.mock('@/components/chat/routing-transparency', () => ({
  RoutingTransparency: () => <div>routing</div>,
}));

vi.mock('@/lib/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
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

    expect(
      screen.getByText('No visible final answer was produced for this reply. Regenerate to retry.'),
    ).toBeInTheDocument();
  });

  it('renders the routed model and router path from metadata', () => {
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
          finalProvider: 'local-ollama',
          finalModel: 'glm-5.1:cloud',
        },
      },
      createdAt: '2026-04-21T12:00:00.000Z',
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText('local-ollama / glm-5.1:cloud')).toBeInTheDocument();
    expect(screen.getByText('Route: qwen3:1.7b -> glm-5.1:cloud')).toBeInTheDocument();
  });
});
