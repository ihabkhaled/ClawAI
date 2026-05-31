import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ParallelMessageGroup } from '@/components/chat/parallel-message-group';
import { FileDeliveryMode, MessageRole, ParallelModelStatus } from '@/enums';
import type { ChatMessage } from '@/types';

// AttachmentDeliveryChip uses useTranslation() directly — provide a stub.
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

function withQueryClient(children: ReactNode): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const t = (key: string): string => key;

function makeAssistantMessage(
  id: string,
  provider: string,
  model: string,
  overrides: Partial<ChatMessage> = {},
  extraMetadata: Record<string, unknown> = {},
): ChatMessage {
  return {
    id,
    threadId: 'thread-1',
    role: MessageRole.ASSISTANT,
    content: `Response from ${model}`,
    provider,
    model,
    routingMode: null,
    routerModel: null,
    usedFallback: false,
    inputTokens: 1000,
    outputTokens: 2269,
    feedback: null,
    latencyMs: 56_200,
    metadata: {
      parallelExecution: true,
      parallelGroupId: 'group-1',
      status: ParallelModelStatus.COMPLETED,
      ...extraMetadata,
    },
    createdAt: '2026-05-31T12:00:00.000Z',
    ...overrides,
  };
}

describe('ParallelMessageGroup — in-thread compare card parity', () => {
  it('renders Raw/Copy/Download .md toolbar + Latency + Tokens + No-judge badge for each per-model message', () => {
    const messages = [
      makeAssistantMessage('msg-1', 'openai', 'gpt-4o-mini'),
      makeAssistantMessage('msg-2', 'anthropic', 'claude-sonnet-4'),
    ];

    render(withQueryClient(<ParallelMessageGroup messages={messages} t={t} />));

    // Toolbar (one row per card) — these labels come from CompareResultCard
    // (the SAME card used by /chat/compare). Two cards => two of each.
    expect(screen.getAllByText('compare.viewRaw')).toHaveLength(2);
    expect(screen.getAllByText('compare.copy')).toHaveLength(2);
    expect(screen.getAllByText('compare.exportMd')).toHaveLength(2);
    expect(screen.getAllByText('compare.expand')).toHaveLength(2);

    // Footer-strip latency badge ("Latency: 56.2s") — one per card.
    expect(screen.getAllByText(/compare\.latency.*56\.2s/).length).toBeGreaterThanOrEqual(2);

    // Footer-strip total-tokens badge (1000 + 2269 = 3,269).
    expect(screen.getAllByText(/compare\.tokens.*3,269/).length).toBeGreaterThanOrEqual(2);

    // "No judge" placeholder badge when judgeReview is absent.
    expect(screen.getAllByText('compare.noJudge')).toHaveLength(2);
  });

  it('renders Image-attachment chip when metadata.fileDelivery has a NATIVE_IMAGE entry', () => {
    const messageWithImage = makeAssistantMessage(
      'msg-img',
      'gemini',
      'gemini-2.5-flash',
      {},
      {
        fileDelivery: [
          {
            fileId: 'file-1',
            filename: 'screenshot.png',
            mimeType: 'image/png',
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            mode: FileDeliveryMode.NATIVE_IMAGE,
          },
        ],
      },
    );

    render(withQueryClient(<ParallelMessageGroup messages={[messageWithImage]} t={t} />));

    // AttachmentDeliveryChip is the shared file-delivery indicator that the
    // compare-page card already renders — confirm it shows up in-thread too.
    expect(screen.getByTestId('attachment-delivery-chip')).toBeInTheDocument();
  });
});
