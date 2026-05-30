import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';

// Small controlled wrapper so the textarea sees real state updates when we
// fire change events. Mirrors how the in-thread compare panel wires the
// shared component to its hook's prompt/setPrompt.
function ControlledHarness(props: {
  initialValue?: string;
  onSubmit?: () => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}): ReactElement {
  const [value, setValue] = useState(props.initialValue ?? '');
  return (
    <RichPromptTextarea
      value={value}
      onChange={setValue}
      onSubmit={props.onSubmit}
      placeholder={props.placeholder}
      ariaLabel={props.ariaLabel}
      disabled={props.disabled}
    />
  );
}

describe('RichPromptTextarea', () => {
  it('renders with the supplied placeholder and aria-label', () => {
    render(
      <ControlledHarness placeholder="Type a prompt..." ariaLabel="prompt-input" />,
    );
    const textarea = screen.getByLabelText('prompt-input');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('placeholder', 'Type a prompt...');
  });

  it('calls onChange when the user types', () => {
    const onChange = vi.fn();
    render(
      <RichPromptTextarea value="" onChange={onChange} ariaLabel="prompt-input" />,
    );
    const textarea = screen.getByLabelText('prompt-input');
    fireEvent.change(textarea, { target: { value: 'hi' } });
    expect(onChange).toHaveBeenCalledWith('hi');
  });

  it('calls onSubmit on plain Enter when value is non-empty and not disabled', () => {
    const onSubmit = vi.fn();
    render(
      <ControlledHarness
        initialValue="hello"
        onSubmit={onSubmit}
        ariaLabel="prompt-input"
      />,
    );
    const textarea = screen.getByLabelText('prompt-input');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onSubmit on Enter when value is empty/whitespace', () => {
    const onSubmit = vi.fn();
    render(
      <ControlledHarness initialValue="   " onSubmit={onSubmit} ariaLabel="prompt-input" />,
    );
    const textarea = screen.getByLabelText('prompt-input');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does NOT call onSubmit and falls through to default newline on Shift+Enter', () => {
    const onSubmit = vi.fn();
    render(
      <ControlledHarness
        initialValue="hello"
        onSubmit={onSubmit}
        ariaLabel="prompt-input"
      />,
    );
    const textarea = screen.getByLabelText('prompt-input');
    const event = fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    // fireEvent.keyDown returns true when the event was NOT preventDefault'd.
    // A Shift+Enter should be passed through to the browser's default newline
    // handler, so the event remains non-defaultPrevented.
    expect(event).toBe(true);
  });

  it('does NOT call onSubmit during an IME composition even if Enter fires', () => {
    const onSubmit = vi.fn();
    render(
      <ControlledHarness
        initialValue="こん"
        onSubmit={onSubmit}
        ariaLabel="prompt-input"
      />,
    );
    const textarea = screen.getByLabelText('prompt-input');
    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).not.toHaveBeenCalled();
    // After compositionend, Enter resumes submitting.
    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('respects disabled — textarea is disabled and Enter does not submit', () => {
    const onSubmit = vi.fn();
    render(
      <ControlledHarness
        initialValue="hello"
        onSubmit={onSubmit}
        ariaLabel="prompt-input"
        disabled
      />,
    );
    const textarea = screen.getByLabelText('prompt-input') as HTMLTextAreaElement;
    expect(textarea).toBeDisabled();
    // Even if we coerce a keydown on a disabled element, the hook short-circuits.
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('auto-resizes by setting style.height after value changes (autosize effect)', () => {
    // jsdom does not produce a numeric computed line-height, so we manually
    // override getComputedStyle for the duration of this test so the autosize
    // effect can resolve a per-line pixel height. Once it can, every value
    // change triggers the effect which sets style.height to a px value
    // clamped between minRows*lineHeight and maxRows*lineHeight.
    const realGetComputedStyle = window.getComputedStyle.bind(window);
    window.getComputedStyle = ((el: Element): CSSStyleDeclaration => {
      const real = realGetComputedStyle(el);
      // Use a Proxy so only `lineHeight` is intercepted; everything else stays
      // delegated to the underlying jsdom implementation.
      return new Proxy(real, {
        get(target, prop, receiver): unknown {
          if (prop === 'lineHeight') {
            return '20px';
          }
          return Reflect.get(target, prop, receiver);
        },
      });
    }) as typeof window.getComputedStyle;

    try {
      const { rerender } = render(
        <RichPromptTextarea
          value="one"
          onChange={vi.fn()}
          ariaLabel="prompt-input"
          minRows={2}
          maxRows={6}
        />,
      );
      const textarea = screen.getByLabelText('prompt-input') as HTMLTextAreaElement;
      // jsdom returns scrollHeight=0 by default; stub it so the autosize
      // effect resolves a non-zero clamped height we can assert on.
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => 200,
      });
      rerender(
        <RichPromptTextarea
          value={'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine'}
          onChange={vi.fn()}
          ariaLabel="prompt-input"
          minRows={2}
          maxRows={6}
        />,
      );
      // After the effect runs, style.height must be a px value: clamped to
      // max = maxRows * 20px = 120px because scrollHeight (200) > cap.
      expect(textarea.style.height).toBe('120px');
      // overflowY must flip to 'auto' since scrollHeight exceeds the cap.
      expect(textarea.style.overflowY).toBe('auto');
    } finally {
      window.getComputedStyle = realGetComputedStyle;
    }
  });
});
