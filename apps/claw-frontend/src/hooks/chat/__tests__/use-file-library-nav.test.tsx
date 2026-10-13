import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFileLibraryNav } from '@/hooks/chat/use-file-library-nav';

function Harness({ onHostKey }: { onHostKey: (key: string) => void }): React.ReactElement {
  const nav = useFileLibraryNav();
  return (
    <div role="presentation" onKeyDown={(event) => onHostKey(event.key)}>
      <div ref={nav.containerRef}>
        <input aria-label="search" data-library-nav="" />
        <button type="button" data-library-nav="">
          first-row
        </button>
        <button type="button" data-library-nav="">
          last-row
        </button>
      </div>
    </div>
  );
}

describe('useFileLibraryNav', () => {
  it('keeps arrows that move inside the library away from the host', () => {
    const onHostKey = vi.fn();
    render(<Harness onHostKey={onHostKey} />);
    screen.getByLabelText('search').focus();

    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'ArrowDown' });

    expect(screen.getByText('first-row')).toHaveFocus();
    expect(onHostKey).not.toHaveBeenCalled();
  });

  it('lets ArrowUp on the first and ArrowDown on the last element reach the host', () => {
    const onHostKey = vi.fn();
    render(<Harness onHostKey={onHostKey} />);

    screen.getByLabelText('search').focus();
    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'ArrowUp' });
    screen.getByText('last-row').focus();
    fireEvent.keyDown(screen.getByText('last-row'), { key: 'ArrowDown' });

    expect(onHostKey).toHaveBeenCalledTimes(2);
    expect(onHostKey).toHaveBeenNthCalledWith(1, 'ArrowUp');
    expect(onHostKey).toHaveBeenNthCalledWith(2, 'ArrowDown');
  });

  it('never swallows Tab, Escape or typing', () => {
    const onHostKey = vi.fn();
    render(<Harness onHostKey={onHostKey} />);
    const search = screen.getByLabelText('search');
    search.focus();

    fireEvent.keyDown(search, { key: 'Tab' });
    fireEvent.keyDown(search, { key: 'Escape' });
    fireEvent.keyDown(search, { key: 'a' });

    expect(onHostKey.mock.calls.map(([key]) => key)).toEqual(['Tab', 'Escape', 'a']);
  });
});
