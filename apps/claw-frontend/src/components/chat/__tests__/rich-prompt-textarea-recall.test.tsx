import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';

// ArrowUp/ArrowDown history, the way a shell does it: up goes older, down goes
// newer, down past the newest restores the empty composer.
//
// The refusals are the part that matters. Recall must never overwrite text the
// user is typing, and must never throw away an edit they made to a recalled
// message — both are work they cannot get back with an undo.
const HISTORY = ['newest question', 'middle question', 'oldest question'];

function renderComposer(value: string, onChange: () => void) {
  return render(
    <RichPromptTextarea
      value={value}
      onChange={onChange}
      recallHistory={HISTORY}
      ariaLabel="prompt-input"
    />,
  );
}

describe('RichPromptTextarea — history recall', () => {
  it('recalls the most recent message from an empty composer', () => {
    const onChange = vi.fn();
    renderComposer('', onChange);
    fireEvent.keyDown(screen.getByLabelText('prompt-input'), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith('newest question');
  });

  it('walks further back on each ArrowUp', () => {
    const onChange = vi.fn();
    const { rerender } = renderComposer('', onChange);
    const field = screen.getByLabelText('prompt-input');

    fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith('newest question');

    // The parent is controlled, so the recalled value comes back as the prop.
    rerender(
      <RichPromptTextarea
        value="newest question"
        onChange={onChange}
        recallHistory={HISTORY}
        ariaLabel="prompt-input"
      />,
    );
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith('middle question');

    rerender(
      <RichPromptTextarea
        value="middle question"
        onChange={onChange}
        recallHistory={HISTORY}
        ariaLabel="prompt-input"
      />,
    );
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith('oldest question');
  });

  it('stops at the oldest message instead of wrapping', () => {
    const onChange = vi.fn();
    const { rerender } = renderComposer('', onChange);
    const field = screen.getByLabelText('prompt-input');

    for (const [index, expected] of HISTORY.entries()) {
      fireEvent.keyDown(field, { key: 'ArrowUp' });
      expect(onChange).toHaveBeenLastCalledWith(expected);
      rerender(
        <RichPromptTextarea
          value={HISTORY[index] ?? ''}
          onChange={onChange}
          recallHistory={HISTORY}
          ariaLabel="prompt-input"
        />,
      );
    }

    onChange.mockClear();
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('walks forward again on ArrowDown', () => {
    const onChange = vi.fn();
    const { rerender } = renderComposer('', onChange);
    const field = screen.getByLabelText('prompt-input');

    fireEvent.keyDown(field, { key: 'ArrowUp' });
    rerender(
      <RichPromptTextarea
        value="newest question"
        onChange={onChange}
        recallHistory={HISTORY}
        ariaLabel="prompt-input"
      />,
    );
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    rerender(
      <RichPromptTextarea
        value="middle question"
        onChange={onChange}
        recallHistory={HISTORY}
        ariaLabel="prompt-input"
      />,
    );

    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith('newest question');
  });

  it('clears the composer when ArrowDown goes past the newest message', () => {
    const onChange = vi.fn();
    const { rerender } = renderComposer('', onChange);
    const field = screen.getByLabelText('prompt-input');

    fireEvent.keyDown(field, { key: 'ArrowUp' });
    rerender(
      <RichPromptTextarea
        value="newest question"
        onChange={onChange}
        recallHistory={HISTORY}
        ariaLabel="prompt-input"
      />,
    );
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('does NOT overwrite text the user has already typed', () => {
    const onChange = vi.fn();
    renderComposer('half a thought', onChange);
    fireEvent.keyDown(screen.getByLabelText('prompt-input'), { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stops recalling once the user edits a recalled message', () => {
    // The edit is the user taking ownership of the text. From here the arrows
    // move the caret through it; another ArrowUp would discard their work.
    const onChange = vi.fn();
    const { rerender } = renderComposer('', onChange);
    const field = screen.getByLabelText('prompt-input');

    fireEvent.keyDown(field, { key: 'ArrowUp' });
    rerender(
      <RichPromptTextarea
        value="newest question"
        onChange={onChange}
        recallHistory={HISTORY}
        ariaLabel="prompt-input"
      />,
    );
    fireEvent.change(field, { target: { value: 'newest question, edited' } });
    rerender(
      <RichPromptTextarea
        value="newest question, edited"
        onChange={onChange}
        recallHistory={HISTORY}
        ariaLabel="prompt-input"
      />,
    );

    onChange.mockClear();
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores ArrowDown in a composer that is not recalling', () => {
    const onChange = vi.fn();
    renderComposer('', onChange);
    fireEvent.keyDown(screen.getByLabelText('prompt-input'), { key: 'ArrowDown' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does nothing when there is no history to recall', () => {
    const onChange = vi.fn();
    render(
      <RichPromptTextarea
        value=""
        onChange={onChange}
        recallHistory={[]}
        ariaLabel="prompt-input"
      />,
    );
    fireEvent.keyDown(screen.getByLabelText('prompt-input'), { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaves the arrows alone when a modifier is held', () => {
    const onChange = vi.fn();
    renderComposer('', onChange);
    const field = screen.getByLabelText('prompt-input');
    for (const modifier of ['shiftKey', 'ctrlKey', 'metaKey', 'altKey']) {
      fireEvent.keyDown(field, { key: 'ArrowUp', [modifier]: true });
    }
    expect(onChange).not.toHaveBeenCalled();
  });
});
