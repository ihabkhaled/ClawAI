import { describe, expect, it } from 'vitest';

import { MessageRole, RoutingMode } from '@/enums';
import type { ChatMessage } from '@/types';
import { getResearchRunFromMessage } from '@/utilities';

const baseMessage: ChatMessage = {
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
  outputTokens: 20,
  feedback: null,
  latencyMs: 500,
  metadata: null,
  createdAt: '2026-04-23T12:00:00.000Z',
};

describe('getResearchRunFromMessage', () => {
  it('parses persisted research metadata from an assistant message', () => {
    const run = getResearchRunFromMessage({
      ...baseMessage,
      metadata: {
        research: {
          runId: 'run-1',
          workflow: 'SEARCH_FETCH_EXTRACT',
          intent: 'latest ai news',
          status: 'COMPLETED',
          bundle: {
            intent: 'latest ai news',
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
              latencyMs: 10,
              message: 'done',
              timestamp: '2026-04-23T12:00:00.000Z',
            },
          ],
          errorMessage: null,
          startedAt: '2026-04-23T12:00:00.000Z',
          completedAt: '2026-04-23T12:00:01.000Z',
        },
      },
    });

    expect(run?.id).toBe('run-1');
    expect('providerSelection' in (run?.bundle ?? {})).toBe(true);
    expect(run?.bundle.providerSelection.providerName).toBe('Exa');
  });

  it('returns null when no research bundle is present', () => {
    expect(getResearchRunFromMessage(baseMessage)).toBeNull();
  });
});
