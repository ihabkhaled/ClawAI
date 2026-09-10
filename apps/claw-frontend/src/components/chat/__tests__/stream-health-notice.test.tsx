import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StreamHealthNotice } from '@/components/chat/stream-health-notice';
import { SseConnectionHealth } from '@/enums';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string): string => key }),
}));

/**
 * A dropped stream used to be indistinguishable from a slow answer.
 *
 * The client reconnected in silence, and when it could not, nothing on the page
 * changed at all: the answer simply never arrived. The user waited, and waiting
 * was the one thing that could not help.
 */
describe('StreamHealthNotice', () => {
  it('renders nothing while the connection is healthy', () => {
    // It sits inside the conversation column, so on the normal path it must
    // cost the transcript no vertical space at all.
    const { container } = render(<StreamHealthNotice health={SseConnectionHealth.LIVE} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('says a reconnect is under way', () => {
    render(<StreamHealthNotice health={SseConnectionHealth.RECONNECTING} />);

    expect(screen.getByText('chat.stream.reconnecting')).toBeInTheDocument();
  });

  it('says the connection is gone, and what to do about it', () => {
    render(<StreamHealthNotice health={SseConnectionHealth.LOST} />);

    expect(screen.getByText('chat.stream.connectionLost')).toBeInTheDocument();
  });

  it('announces itself politely to a screen reader', () => {
    // The user is waiting and looking elsewhere; this is exactly the case
    // aria-live exists for. `polite` rather than `assertive` because it must
    // not interrupt the answer being read out.
    render(<StreamHealthNotice health={SseConnectionHealth.RECONNECTING} />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('distinguishes a lost connection from a reconnecting one visually', () => {
    const { rerender } = render(<StreamHealthNotice health={SseConnectionHealth.RECONNECTING} />);
    const reconnecting = screen.getByRole('status').className;

    rerender(<StreamHealthNotice health={SseConnectionHealth.LOST} />);
    const lost = screen.getByRole('status').className;

    expect(lost).not.toBe(reconnecting);
    expect(lost).toContain('destructive');
  });
});
