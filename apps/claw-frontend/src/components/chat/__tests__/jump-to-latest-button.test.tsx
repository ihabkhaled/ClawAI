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
});
