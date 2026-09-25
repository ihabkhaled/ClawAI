import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageBubble } from '@/components/chat/message-bubble';
import { MessageRole, RoutingMode } from '@/enums';
import { en } from '@/lib/i18n/locales/en';
import type { ChatMessage } from '@/types';

// Heavy siblings the bubble composes; this file is about the plan notice only.
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
vi.mock('@/components/chat/message-edit-action', () => ({
  MessageEditAction: () => <div>edit-action</div>,
}));
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

const STORED_ENGLISH_FALLBACK =
  "Creating and editing images isn't included in your current plan. Upgrade to generate images; you can still attach images and ask about them.";

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

describe('MessageBubble — plan feature refusal (ADR-122)', () => {
  it('shows the translated notice and a visible upgrade link instead of the stored English text', () => {
    render(
      <MessageBubble
        message={assistant({
          content: STORED_ENGLISH_FALLBACK,
          metadata: { type: 'plan_feature_disabled', planFeature: 'allowImageGeneration' },
        })}
      />,
    );

    const notice = screen.getByTestId('plan-feature-notice');
    expect(notice).toBeVisible();
    expect(screen.getByText('Unlock Image generation')).toBeVisible();
    expect(
      screen.getByText('This message needed a feature your current plan does not cover.'),
    ).toBeVisible();
    const upgrade = screen.getByRole('link', { name: en.chat.limits.upgradeCta });
    expect(upgrade).toBeVisible();
    expect(upgrade).toHaveAttribute('href', '/plan');
    expect(screen.queryByText(STORED_ENGLISH_FALLBACK)).not.toBeInTheDocument();
    expect(screen.queryByText('image-generation')).not.toBeInTheDocument();
  });

  it('renders an ordinary answer without the notice', () => {
    render(<MessageBubble message={assistant({ provider: 'OPENAI', model: 'gpt-4o' })} />);

    expect(screen.getByText('Photosynthesis turns light into chemical energy.')).toBeVisible();
    expect(screen.queryByTestId('plan-feature-notice')).not.toBeInTheDocument();
    expect(screen.queryByText('Unlock Image generation')).not.toBeInTheDocument();
  });
});
