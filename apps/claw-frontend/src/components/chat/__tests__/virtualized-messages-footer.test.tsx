import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VirtualizedMessagesFooter } from '@/components/chat/virtualized-messages-footer';
import { NarrationKind } from '@/enums/narration-kind.enum';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

vi.mock('@/components/chat/runtime-progress', () => ({
  RuntimeProgressPanel: ({ streamError }: { streamError?: string | null }) => (
    <div data-testid="runtime-progress-panel">{streamError}</div>
  ),
}));

describe('VirtualizedMessagesFooter', () => {
  it('renders the runtime progress panel when waiting for a response', () => {
    render(
      <VirtualizedMessagesFooter
        isWaitingForResponse
        fallbackAttempts={[]}
        streamError={null}
        limitNotice={null}
        progressStages={[]}
        currentStageLabel={null}
      />,
    );
    expect(screen.getByTestId('runtime-progress-panel')).toBeInTheDocument();
  });

  it('renders nothing when not waiting for a response', () => {
    const { container } = render(
      <VirtualizedMessagesFooter
        isWaitingForResponse={false}
        fallbackAttempts={[]}
        streamError={null}
        limitNotice={null}
        progressStages={[]}
        currentStageLabel={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps a send error visible after the waiting state stops', () => {
    render(
      <VirtualizedMessagesFooter
        isWaitingForResponse={false}
        fallbackAttempts={[]}
        streamError="Your trial ended"
        limitNotice={null}
        progressStages={[]}
        currentStageLabel={null}
      />,
    );
    expect(screen.getByText('Your trial ended')).toBeInTheDocument();
  });

  // The live half of the work log: crawl, search and back-to-the-AI lines as
  // they happen, above the progress panel.
  it('shows the live work log while a turn is running', () => {
    render(
      <VirtualizedMessagesFooter
        isWaitingForResponse
        fallbackAttempts={[]}
        streamError={null}
        limitNotice={null}
        progressStages={[]}
        currentStageLabel={null}
        narration={[{ id: 'n1', kind: NarrationKind.BACK_TO_AI, at: '2026-09-19T10:00:00.000Z' }]}
      />,
    );
    expect(screen.getByTestId('narration-log')).toHaveAttribute('open');
    expect(screen.getByText('narration.backToAi')).toBeInTheDocument();
  });
});
