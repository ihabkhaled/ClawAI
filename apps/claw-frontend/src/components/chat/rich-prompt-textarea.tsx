import { forwardRef, useImperativeHandle } from 'react';

import { Textarea } from '@/components/ui/textarea';
import { useRichPromptTextarea } from '@/hooks/chat/use-rich-prompt-textarea';
import { cn } from '@/lib/utils';
import type { RichPromptTextareaProps } from '@/types';

/**
 * Shared rich textarea used by both the main chat MessageComposer and the
 * in-thread compare panel. Wraps shadcn <Textarea> with:
 *
 *   - Auto-resize from minRows to maxRows (then internal scroll)
 *   - Enter → onSubmit (when value non-empty after trim AND !disabled)
 *   - Shift+Enter → default newline behaviour
 *   - IME-safe composition: never submit while a CJK/IME composition is in
 *     flight (tracked via compositionStart/End + nativeEvent.isComposing)
 *   - ref forwarding so parents can imperatively focus the textarea
 *
 * The .tsx is pure render composition; all imperative DOM work (autosize,
 * key handling, composition tracking) lives in useRichPromptTextarea per the
 * "TSX files = render only" rule.
 */
export const RichPromptTextarea = forwardRef<HTMLTextAreaElement, RichPromptTextareaProps>(
  function RichPromptTextarea(props, forwardedRef): React.ReactElement {
    const {
      value,
      onChange,
      onSubmit,
      placeholder,
      disabled = false,
      minRows,
      maxRows,
      ariaLabel,
      className,
    } = props;

    const {
      textareaRef,
      handleChange,
      handleKeyDown,
      handleCompositionStart,
      handleCompositionEnd,
    } = useRichPromptTextarea({ value, onChange, onSubmit, disabled, minRows, maxRows });

    // Bridge the internal textareaRef (used for autosize measurements) with
    // the consumer's forwarded ref so callers can still focus/blur the
    // element. useImperativeHandle is the React-19-blessed way to expose a
    // proxy ref without leaking the underlying node identity. The hook
    // returns a stable ref object so depending on it does NOT re-run on
    // every render — it satisfies the exhaustive-deps rule without cost.
    useImperativeHandle(
      forwardedRef,
      () => textareaRef.current as HTMLTextAreaElement,
      [textareaRef],
    );

    return (
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        rows={minRows}
        // Allow vertical drag-resize. Autosize still drives initial height
        // and content-grow up to maxRows; the hook latches "user resized"
        // via ResizeObserver and stops auto-growing once the handle is used.
        className={cn('resize-y', className)}
      />
    );
  },
);
