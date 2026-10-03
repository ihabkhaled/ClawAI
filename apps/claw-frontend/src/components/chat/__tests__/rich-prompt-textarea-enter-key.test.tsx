import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';
import { MEDIA_QUERY_COARSE_POINTER } from '@/constants/media-query.constants';

function stubPointer(coarse: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: coarse && query === MEDIA_QUERY_COARSE_POINTER,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

function Harness(props: { initial?: string; onSubmit: () => void }): ReactElement {
  const [value, setValue] = useState(props.initial ?? '');
  return (
    <RichPromptTextarea
      value={value}
      onChange={setValue}
      onSubmit={props.onSubmit}
      ariaLabel="prompt"
    />
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RichPromptTextarea Enter key', () => {
  it('desktop: Enter sends and is swallowed', () => {
    stubPointer(false);
    const onSubmit = vi.fn();
    render(<Harness initial="hi" onSubmit={onSubmit} />);
    const notPrevented = fireEvent.keyDown(screen.getByLabelText('prompt'), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });

  it('desktop: Shift+Enter does not send and keeps the native newline', () => {
    stubPointer(false);
    const onSubmit = vi.fn();
    render(<Harness initial="hi" onSubmit={onSubmit} />);
    const notPrevented = fireEvent.keyDown(screen.getByLabelText('prompt'), {
      key: 'Enter',
      shiftKey: true,
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it('desktop: Ctrl+Enter inserts a newline at the caret and does not send', async () => {
    stubPointer(false);
    const onSubmit = vi.fn();
    render(<Harness initial="ab" onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText<HTMLTextAreaElement>('prompt');
    textarea.setSelectionRange(1, 1);
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea.value).toBe('a\nb');
  });

  it('touch: Enter is a newline, never a send', () => {
    stubPointer(true);
    const onSubmit = vi.fn();
    render(<Harness initial="hi" onSubmit={onSubmit} />);
    const notPrevented = fireEvent.keyDown(screen.getByLabelText('prompt'), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it('IME: keyCode 229 and isComposing never send', () => {
    stubPointer(false);
    const onSubmit = vi.fn();
    render(<Harness initial="hi" onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText('prompt');
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
