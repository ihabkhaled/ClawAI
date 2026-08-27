import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VirtualizedMessagesFooter } from '@/components/chat/virtualized-messages-footer';

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
});
