import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useThreadEditorFocus } from '@/hooks/threads/use-thread-editor-focus';

describe('useThreadEditorFocus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('scrolls the editor to its top and focuses the text field when editing starts', () => {
    document.body.innerHTML =
      '<form id="thread-revision-editor"><textarea id="thread-revision-markdown"></textarea></form>';
    const scrollIntoView = vi.fn();
    const editor = document.getElementById('thread-revision-editor');
    if (editor) {
      editor.scrollIntoView = scrollIntoView;
    }

    const { rerender } = renderHook(({ editing }) => useThreadEditorFocus(editing), {
      initialProps: { editing: false },
    });
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender({ editing: true });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(document.activeElement?.id).toBe('thread-revision-markdown');
  });
});
