import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessageProvenance } from '@/components/chat/message-provenance';
import { MessageRole, RoutingMode } from '@/enums';
import type { ChatMessage } from '@/types';

describe('MessageProvenance', () => {
  it('renders route metadata even when provider and token fields are empty', () => {
    const message: ChatMessage = {
      id: 'msg-1',
      threadId: 'thread-1',
      role: MessageRole.ASSISTANT,
      content: 'Here is the result.',
      provider: null,
      model: null,
      routingMode: RoutingMode.AUTO,
      routerModel: null,
      usedFallback: false,
      inputTokens: null,
      outputTokens: null,
      feedback: null,
      latencyMs: null,
      metadata: {
        routeRoadmap: {
          routerModel: 'qwen3:1.7b',
          finalProvider: 'local-ollama',
          finalModel: 'glm-5.1:cloud',
          steps: [
            {
              provider: 'local-ollama',
              model: 'qwen3:1.7b',
            },
            {
              provider: 'local-ollama',
              model: 'glm-5.1:cloud',
            },
          ],
        },
      },
      createdAt: '2026-04-21T12:00:00.000Z',
    };

    render(<MessageProvenance message={message} />);

    fireEvent.click(screen.getByLabelText('Toggle message provenance'));

    expect(screen.getByText('Router model:')).toBeInTheDocument();
    expect(screen.getByText('qwen3:1.7b')).toBeInTheDocument();
    expect(screen.getByText('Route path:')).toBeInTheDocument();
    expect(
      screen.getByText('local-ollama/qwen3:1.7b -> local-ollama/glm-5.1:cloud'),
    ).toBeInTheDocument();
  });
});
