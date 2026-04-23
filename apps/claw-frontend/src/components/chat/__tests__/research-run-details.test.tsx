import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResearchRunDetails } from '@/components/chat/research-run-details';
import { MessageRole, RoutingMode } from '@/enums';
import type { ChatMessage } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const message: ChatMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  role: MessageRole.ASSISTANT,
  content: 'Answer',
  provider: 'local-ollama',
  model: 'qwen3:1.7b',
  routingMode: RoutingMode.AUTO,
  routerModel: null,
  usedFallback: false,
  inputTokens: 10,
  outputTokens: 10,
  feedback: null,
  latencyMs: 700,
  createdAt: '2026-04-23T12:00:00.000Z',
  metadata: {
    research: {
      runId: 'run-1',
      workflow: 'SEARCH_FETCH_EXTRACT',
      intent: 'Find the latest AI search providers',
      status: 'COMPLETED',
      bundle: {
        intent: 'Find the latest AI search providers',
        workflow: 'SEARCH_FETCH_EXTRACT',
        requestedModel: 'qwen3:1.7b',
        requestedProvider: 'local-ollama',
        providerSelection: {
          providerId: 'provider-exa',
          providerName: 'Exa',
          providerKind: 'EXA',
          selectionMode: 'auto',
          fallbackUsed: true,
          attemptedProviders: ['Firecrawl', 'Exa'],
        },
        helperModels: [],
        toolsUsed: ['web_search', 'web_fetch'],
        items: [],
        warnings: [],
        generatedAt: '2026-04-23T12:00:00.000Z',
        mode: 'detailed',
      },
      trace: [
        {
          phase: 'search',
          status: 'ok',
          latencyMs: 120,
          message: '2 results from Exa',
          timestamp: '2026-04-23T12:00:00.000Z',
        },
      ],
      errorMessage: null,
      startedAt: '2026-04-23T12:00:00.000Z',
      completedAt: '2026-04-23T12:00:01.000Z',
    },
  },
};

describe('ResearchRunDetails', () => {
  it('opens the search results dialog and shows provider trace details', () => {
    render(<ResearchRunDetails message={message} />);

    fireEvent.click(screen.getByRole('button', { name: 'research.results.open' }));

    expect(screen.getByText('research.results.title')).toBeInTheDocument();
    expect(screen.getAllByText(/Exa/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Firecrawl -> Exa/)).toBeInTheDocument();
    expect(screen.getByText('research.results.trace')).toBeInTheDocument();
  });
});
