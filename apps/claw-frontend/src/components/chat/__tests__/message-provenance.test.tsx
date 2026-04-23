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
        progressSummary: [
          {
            label: 'Request accepted',
            description: 'Queued successfully.',
            actorName: 'Claw',
            status: 'completed',
          },
        ],
        routeRoadmap: {
          routerModel: 'qwen3:1.7b',
          research: {
            workflow: 'SEARCH_FETCH_EXTRACT',
            toolsUsed: ['search', 'fetch'],
            itemCount: 3,
            warningCount: 1,
          },
          finalProvider: 'local-ollama',
          finalModel: 'glm-5.1:cloud',
          steps: [
            {
              stage: 'router',
              provider: 'local-ollama',
              model: 'qwen3:1.7b',
            },
            {
              stage: 'research',
              provider: 'research-service',
              model: 'SEARCH_FETCH_EXTRACT',
              displayName: 'Research workflow',
            },
            {
              stage: 'execution',
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
      screen.getByText(
        'router: local-ollama/qwen3:1.7b -> research: research-service/Research workflow -> execution: local-ollama/glm-5.1:cloud',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Research:')).toBeInTheDocument();
    expect(
      screen.getByText('SEARCH_FETCH_EXTRACT • 3 items • search, fetch • 1 warnings'),
    ).toBeInTheDocument();
    expect(screen.getByText('Progress summary:')).toBeInTheDocument();
    expect(screen.getByText('Queued successfully.')).toBeInTheDocument();
  });
});
