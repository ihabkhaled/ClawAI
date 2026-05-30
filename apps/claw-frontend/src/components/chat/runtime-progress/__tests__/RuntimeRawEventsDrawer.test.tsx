import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RuntimeRawEventsDrawer } from '@/components/chat/runtime-progress';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

describe('RuntimeRawEventsDrawer', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the empty-state message when no events are supplied', () => {
    render(<RuntimeRawEventsDrawer events={[]} isOpen onToggle={vi.fn()} />);
    expect(screen.getByText('runtimeProgress.rawEvents.empty')).toBeInTheDocument();
  });

  it('renders each event as a JSON block when supplied', () => {
    render(
      <RuntimeRawEventsDrawer
        events={[{ type: 'token', delta: 'hi' }, { type: 'done' }]}
        isOpen
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/"type"/).length).toBeGreaterThan(0);
    // Two events → two copy buttons.
    expect(screen.getAllByRole('button', { name: 'runtimeProgress.rawEvents.copy' })).toHaveLength(
      2,
    );
  });

  it('writes the event JSON to the clipboard when the copy button is clicked', () => {
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    render(<RuntimeRawEventsDrawer events={[{ type: 'token' }]} isOpen onToggle={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'runtimeProgress.rawEvents.copy' }));
    expect(writeText).toHaveBeenCalledWith(JSON.stringify({ type: 'token' }, null, 2));
  });

  it('invokes onToggle when the disclosure changes state', () => {
    const onToggle = vi.fn();
    render(<RuntimeRawEventsDrawer events={[]} isOpen={false} onToggle={onToggle} />);
    const details = screen.getByText('runtimeProgress.rawEvents.title').closest('details');
    expect(details).not.toBeNull();
    if (details === null) {
      return;
    }
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
