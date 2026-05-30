import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VisibleReasoningPanel } from '@/components/chat/runtime-progress';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

describe('VisibleReasoningPanel', () => {
  it('renders the reasoning text when non-empty', () => {
    render(<VisibleReasoningPanel reasoning="Step 1: parse the query." />);
    expect(screen.getByText('Step 1: parse the query.')).toBeInTheDocument();
    expect(screen.getByText('chat.stream.reasoning.title')).toBeInTheDocument();
  });

  it('returns null on empty / whitespace-only reasoning', () => {
    const { container } = render(<VisibleReasoningPanel reasoning="   " />);
    expect(container).toBeEmptyDOMElement();
  });

  it('invokes onToggle when the disclosure is opened or closed', () => {
    const onToggle = vi.fn();
    render(<VisibleReasoningPanel reasoning="hello" onToggle={onToggle} />);
    const details = screen.getByText('hello').closest('details');
    expect(details).not.toBeNull();
    if (details === null) {
      return;
    }
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
