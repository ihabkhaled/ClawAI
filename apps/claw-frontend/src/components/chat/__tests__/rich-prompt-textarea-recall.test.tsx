import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';

// ArrowUp history recall: pressing Up in an EMPTY composer puts the user's own
// previous message back in the field, the way a shell history does. The rules
// that matter are the refusals — recall must never overwrite text the user is
// already typing, and must never fire when there is nothing to recall.
describe('RichPromptTextarea — ArrowUp recall', () => {
  it('recalls the previous message when the field is empty', () => {
    const onChange = vi.fn();
    render(
      <RichPromptTextarea
        value=""
        onChange={onChange}
        recallValue="what did I ask before"
        ariaLabel="prompt-input"
      />,
    );
    fireEvent.keyDown(screen.getByLabelText('prompt-input'), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith('what did I ask before');
  });

  it('does NOT overwrite text the user has already typed', () => {
    const onChange = vi.fn();
    render(
      <RichPromptTextarea
        value="half a thought"
        onChange={onChange}
        recallValue="previous"
        ariaLabel="prompt-input"
      />,
    );
    fireEvent.keyDown(screen.getByLabelText('prompt-input'), { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does nothing when there is no previous message to recall', () => {
    const onChange = vi.fn();
    render(<RichPromptTextarea value="" onChange={onChange} ariaLabel="prompt-input" />);
    fireEvent.keyDown(screen.getByLabelText('prompt-input'), { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does nothing while the composer is disabled', () => {
    const onChange = vi.fn();
    render(
      <RichPromptTextarea
        value=""
        onChange={onChange}
        recallValue="previous"
        disabled
        ariaLabel="prompt-input"
      />,
    );
    fireEvent.keyDown(screen.getByLabelText('prompt-input'), { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaves modified ArrowUp (selection / jump) alone', () => {
    const onChange = vi.fn();
    render(
      <RichPromptTextarea
        value=""
        onChange={onChange}
        recallValue="previous"
        ariaLabel="prompt-input"
      />,
    );
    const textarea = screen.getByLabelText('prompt-input');
    fireEvent.keyDown(textarea, { key: 'ArrowUp', shiftKey: true });
    fireEvent.keyDown(textarea, { key: 'ArrowUp', ctrlKey: true });
    fireEvent.keyDown(textarea, { key: 'ArrowUp', metaKey: true });
    fireEvent.keyDown(textarea, { key: 'ArrowUp', altKey: true });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not recall mid-IME-composition', () => {
    const onChange = vi.fn();
    render(
      <RichPromptTextarea
        value=""
        onChange={onChange}
        recallValue="previous"
        ariaLabel="prompt-input"
      />,
    );
    const textarea = screen.getByLabelText('prompt-input');
    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
