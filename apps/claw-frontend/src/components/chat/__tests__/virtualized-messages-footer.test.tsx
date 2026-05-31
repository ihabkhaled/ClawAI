import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VirtualizedMessagesFooter } from '@/components/chat/virtualized-messages-footer';

vi.mock('@/components/chat/thinking-indicator', () => ({
  ThinkingIndicator: () => <div data-testid="thinking-indicator" />,
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
});
