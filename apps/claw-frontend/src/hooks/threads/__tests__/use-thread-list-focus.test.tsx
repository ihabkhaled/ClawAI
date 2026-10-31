import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useThreadListFocus } from '../use-thread-list-focus';

function setup() {
  const heading = document.createElement('h2');
  heading.tabIndex = -1;
  document.body.append(heading);
  return { heading, ref: { current: heading } };
}

describe('useThreadListFocus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does nothing on first render', () => {
    const { heading, ref } = setup();
    renderHook(() => useThreadListFocus(1, true, ref));
    expect(heading).not.toHaveFocus();
  });

  it('focuses the heading once the new page has settled', () => {
    const { heading, ref } = setup();
    const { rerender } = renderHook(({ page, ok }) => useThreadListFocus(page, ok, ref), {
      initialProps: { page: 1, ok: true },
    });
    rerender({ page: 2, ok: false });
    expect(heading).not.toHaveFocus();
    rerender({ page: 2, ok: true });
    expect(heading).toHaveFocus();
  });

  it('never steals focus from a field the owner is typing in', () => {
    const { heading, ref } = setup();
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    const { rerender } = renderHook(({ page }) => useThreadListFocus(page, true, ref), {
      initialProps: { page: 3 },
    });
    rerender({ page: 1 });
    expect(heading).not.toHaveFocus();
    expect(input).toHaveFocus();
  });
});
