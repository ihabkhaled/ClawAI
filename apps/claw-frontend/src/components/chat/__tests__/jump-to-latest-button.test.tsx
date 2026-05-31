import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JumpToLatestButton } from '@/components/chat/jump-to-latest-button';
import type { TranslateFunction } from '@/types/i18n.types';

const t: TranslateFunction = (key: string): string => {
  if (key === 'chat.jumpToLatest') {
    return 'Jump to latest';
  }
  return key;
};

describe('JumpToLatestButton', () => {
  it('renders nothing when visible=false', () => {
    const { container } = render(<JumpToLatestButton visible={false} onClick={vi.fn()} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the i18n label when visible=true', () => {
    render(<JumpToLatestButton visible onClick={vi.fn()} t={t} />);
    expect(screen.getByText('Jump to latest')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();
  });

  it('invokes onClick when clicked', () => {
    const onClick = vi.fn();
    render(<JumpToLatestButton visible onClick={onClick} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the unread badge when unreadCount > 0', () => {
    render(<JumpToLatestButton visible onClick={vi.fn()} t={t} unreadCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    // The accessible name should include the count so screen readers announce it.
    expect(screen.getByRole('button', { name: /Jump to latest \(3\)/ })).toBeInTheDocument();
  });

  it('clamps the unread badge label to 99+', () => {
    render(<JumpToLatestButton visible onClick={vi.fn()} t={t} unreadCount={250} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('hides the unread badge when unreadCount is 0 or undefined', () => {
    const { rerender } = render(
      <JumpToLatestButton visible onClick={vi.fn()} t={t} unreadCount={0} />,
    );
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    rerender(<JumpToLatestButton visible onClick={vi.fn()} t={t} />);
    expect(screen.queryByText(/^\d/)).not.toBeInTheDocument();
  });
});
