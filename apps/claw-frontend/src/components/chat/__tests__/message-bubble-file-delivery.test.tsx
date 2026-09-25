import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageBubble } from '@/components/chat/message-bubble';
import { FileDeliveryMode, MessageRole, RoutingMode } from '@/enums';
import type { Locale } from '@/enums/locale.enum';
import type { ChatMessage } from '@/types';

// Found live 2026-09-25 (docs/16-quality-engineering/evidence/2026-09-25-multimodal):
// single chat wrote `metadata.fileDelivery`, but the bubble never showed it,
// and the role label was hard-coded English under Arabic. These tests resolve
// REAL dictionaries (en + ar), so they assert the words a user reads — a
// wrong or missing key would render the raw key and fail here.
const localeState = vi.hoisted(() => ({ locale: 'en' }));

vi.mock('@/lib/i18n', async () => {
  const { getDictionary } = await import('@/lib/i18n/translations');
  const { resolveTranslation } = await import('@/lib/i18n/translation-resolver');
  return {
    useTranslation: () => ({
      t: (key: string, params?: Record<string, string | number>) =>
        resolveTranslation(getDictionary(localeState.locale as Locale), key, params),
      locale: localeState.locale,
      dir: localeState.locale === 'ar' ? 'rtl' : 'ltr',
    }),
  };
});

vi.mock('@/components/chat/message-attachments', () => ({
  MessageAttachments: () => <div>attachments</div>,
}));
vi.mock('@/components/chat/message-provenance', () => ({
  MessageProvenance: () => <div>provenance</div>,
}));
vi.mock('@/components/chat/message-edit-action', () => ({
  MessageEditAction: () => <div>edit-action</div>,
}));
vi.mock('@/components/chat/message-branch-action', () => ({
  MessageBranchAction: () => <div>branch-action</div>,
}));
vi.mock('@/components/chat/research-run-details', () => ({
  ResearchRunDetails: () => <div>research-details</div>,
}));
vi.mock('@/components/chat/context-receipt-button', () => ({
  ContextReceiptButton: () => <div>context-receipt</div>,
}));
vi.mock('@/components/chat/message-speech-action', () => ({
  MessageSpeechAction: () => <div>speech-action</div>,
}));
vi.mock('@/components/chat/message-speech-player', () => ({
  MessageSpeechPlayer: () => <div>speech-player</div>,
}));
vi.mock('@/components/chat/why-this-model-panel', () => ({
  WhyThisModelPanel: () => <div>why-this-model</div>,
}));
vi.mock('@/components/chat/thread-context-inspector', () => ({
  ThreadContextInspector: () => <div>context-inspector</div>,
}));
vi.mock('@/lib/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

// The chip's dual-read hook needs a client; no messageId is passed from the
// bubble, so the query stays disabled and nothing is fetched.
function renderBubble(message: ChatMessage): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MessageBubble message={message} />
    </QueryClientProvider>,
  );
}

function assistantMessage(metadata: Record<string, unknown> | null): ChatMessage {
  return {
    id: 'msg-1',
    threadId: 'thread-1',
    role: MessageRole.ASSISTANT,
    content: 'It is a test pattern.',
    provider: 'OLLAMA',
    model: 'gpt-oss:20b',
    routingMode: RoutingMode.MANUAL_MODEL,
    routerModel: null,
    usedFallback: false,
    inputTokens: 10,
    outputTokens: 5,
    feedback: null,
    latencyMs: 900,
    metadata,
    createdAt: '2026-09-25T11:00:00.000Z',
  };
}

const derivedEntry = {
  fileId: 'file-1',
  filename: 'testsrc.png',
  mimeType: 'image/png',
  provider: 'OLLAMA',
  model: 'gpt-oss:20b',
  mode: FileDeliveryMode.DERIVED_IMAGE_TEXT,
  helperProvider: 'GEMINI',
  helperModel: 'gemini-2.5-flash',
};

const omittedEntry = {
  fileId: 'file-2',
  filename: 'free.png',
  mimeType: 'image/png',
  provider: 'OLLAMA',
  model: 'gpt-oss:20b',
  mode: FileDeliveryMode.OMITTED_NO_VISION,
  reason: 'file_delivery.reason.helper_vision_plan',
};

describe('MessageBubble — single-chat delivery note and localized role', () => {
  beforeEach(() => {
    localeState.locale = 'en';
  });

  it('shows the helper-described image as visible, localized text', () => {
    renderBubble(assistantMessage({ fileDelivery: [derivedEntry] }));

    expect(screen.getByTestId('attachment-delivery-chip')).toBeInTheDocument();
    expect(screen.getByTestId('attachment-delivery-badge-described')).toHaveTextContent(
      'Described by helper 1',
    );
    expect(
      screen.getByText('testsrc.png (Described by helper) — GEMINI/gemini-2.5-flash'),
    ).toBeVisible();
  });

  it('shows the honest no-vision note with its localized reason, never the raw key', () => {
    renderBubble(assistantMessage({ fileDelivery: [omittedEntry] }));

    const details = screen.getByTestId('attachment-delivery-details');
    expect(details).toHaveTextContent(
      'free.png (Skipped (no vision)) — Your plan does not include image descriptions, so only its text (OCR) was sent',
    );
    expect(details).not.toHaveTextContent('file_delivery.reason');
    expect(details).not.toHaveTextContent('mediaUi.deliveryReason');
  });

  it('renders no chip when the message carries no fileDelivery', () => {
    renderBubble(assistantMessage({ fileIds: ['file-1'] }));

    expect(screen.queryByTestId('attachment-delivery-chip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attachment-delivery-details')).not.toBeInTheDocument();
  });

  it('localizes the delivery note and the role label in Arabic', () => {
    localeState.locale = 'ar';
    renderBubble(assistantMessage({ fileDelivery: [derivedEntry] }));

    expect(screen.getByText('المساعد')).toBeVisible();
    expect(screen.queryByText('Assistant')).not.toBeInTheDocument();
    expect(screen.getByTestId('attachment-delivery-details')).toHaveTextContent(
      'موصوفة بواسطة مساعد',
    );
  });

  it('labels a user message in the active locale', () => {
    localeState.locale = 'ar';
    renderBubble({ ...assistantMessage(null), role: MessageRole.USER, content: 'مرحبا' });

    expect(screen.getByText('أنت')).toBeVisible();
    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });
});
