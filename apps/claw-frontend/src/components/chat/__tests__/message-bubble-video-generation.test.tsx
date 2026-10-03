import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageBubble } from '@/components/chat/message-bubble';
import { MessageRole, RoutingMode } from '@/enums';
import { en } from '@/lib/i18n/locales/en';
import type { ChatMessage } from '@/types';

// Heavy siblings the bubble composes; this file is about the video bubble branch only.
vi.mock('@/components/chat/file-generation-bubble', () => ({
  FileGenerationBubble: () => <div>file-generation</div>,
}));
vi.mock('@/components/chat/image-generation-bubble', () => ({
  ImageGenerationBubble: () => <div>image-generation</div>,
}));
vi.mock('@/components/chat/video-generation-bubble', () => ({
  VideoGenerationBubble: ({ generationId, prompt }: { generationId: string; prompt: string }) => (
    <div data-testid="video-bubble">
      {generationId}|{prompt}
    </div>
  ),
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
vi.mock('@/components/chat/message-edit-action', () => ({
  MessageEditAction: () => <div>edit-action</div>,
}));
vi.mock('@/components/chat/message-save-action', () => ({ MessageSaveAction: () => null }));
vi.mock('@/components/chat/message-branch-action', () => ({
  MessageBranchAction: () => <div>branch-action</div>,
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
// Read aloud owns a query and a mutation; this file is about the notice.
vi.mock('@/components/chat/message-speech-action', () => ({
  MessageSpeechAction: () => <div>speech-action</div>,
}));
vi.mock('@/components/chat/message-speech-player', () => ({
  MessageSpeechPlayer: () => null,
}));
vi.mock('@/lib/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

// A translator over the REAL English dictionary, so the assertions below are
// on the words a user reads — a key that does not exist would render the raw
// key and fail them.
function translate(key: string, params?: Record<string, string>): string {
  let node: unknown = en;
  for (const part of key.split('.')) {
    node = typeof node === 'object' && node !== null ? Reflect.get(node, part) : undefined;
  }
  const text = typeof node === 'string' ? node : key;
  return Object.entries(params ?? {}).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, value),
    text,
  );
}

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: translate, locale: 'en', dir: 'ltr' }),
}));

const assistant = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: 'msg-2',
  threadId: 'thread-1',
  role: MessageRole.ASSISTANT,
  content: 'Photosynthesis turns light into chemical energy.',
  provider: 'IMAGE_OPENAI',
  model: 'gpt-image-1',
  routingMode: RoutingMode.MANUAL_MODEL,
  routerModel: null,
  usedFallback: false,
  inputTokens: 0,
  outputTokens: 0,
  feedback: null,
  latencyMs: 10,
  metadata: null,
  createdAt: '2026-09-25T12:00:00.000Z',
  ...overrides,
});

describe('MessageBubble — video generation', () => {
  it('renders the live video bubble for a video_generation message and hides the stored text', () => {
    render(
      <MessageBubble
        message={assistant({
          content: 'a fox running through snow',
          provider: 'VIDEO_GEMINI',
          model: 'veo-3.1-fast-generate-preview',
          metadata: { type: 'video_generation', generationId: 'vid-1' },
        })}
      />,
    );

    expect(screen.getByTestId('video-bubble')).toHaveTextContent(
      'vid-1|a fox running through snow',
    );
    // The prompt appears once (inside the bubble), not again as answer text.
    expect(screen.getAllByText(/a fox running through snow/u)).toHaveLength(1);
    expect(screen.queryByText('image-generation')).not.toBeInTheDocument();
  });

  it('renders no video bubble for an ordinary answer', () => {
    render(<MessageBubble message={assistant({ provider: 'OPENAI', model: 'gpt-4o' })} />);

    expect(screen.queryByTestId('video-bubble')).not.toBeInTheDocument();
    expect(screen.getByText('Photosynthesis turns light into chemical energy.')).toBeVisible();
  });

  it('renders no video bubble when the generation id is missing', () => {
    render(<MessageBubble message={assistant({ metadata: { type: 'video_generation' } })} />);

    expect(screen.queryByTestId('video-bubble')).not.toBeInTheDocument();
  });
});
