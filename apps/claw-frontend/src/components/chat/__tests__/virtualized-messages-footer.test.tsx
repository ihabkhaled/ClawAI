import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VirtualizedMessagesFooter } from '@/components/chat/virtualized-messages-footer';

vi.mock('@/components/chat/thinking-indicator', () => ({
  ThinkingIndicator: ({ streamError }: { streamError?: string | null }) => (
    <div data-testid="thinking-indicator">{streamError}</div>
  ),
}));

describe('VirtualizedMessagesFooter', () => {
  it('renders ThinkingIndicator when waiting for a response', () => {
    render(
      <VirtualizedMessagesFooter
        isWaitingForResponse
        fallbackAttempts={[]}
        streamError={null}
        progressStages={[]}
        currentStageLabel={null}
      />,
    );
    expect(screen.getByTestId('thinking-indicator')).toBeInTheDocument();
  });

  it('renders nothing when not waiting for a response', () => {
    const { container } = render(
      <VirtualizedMessagesFooter
        isWaitingForResponse={false}
        fallbackAttempts={[]}
        streamError={null}
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
        progressStages={[]}
        currentStageLabel={null}
      />,
    );
    expect(screen.getByText('Your trial ended')).toBeInTheDocument();
  });
});
