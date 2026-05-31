import { useCallback, useEffect, useRef, useState } from 'react';

import {
  RICH_PROMPT_DEFAULT_MAX_ROWS,
  RICH_PROMPT_DEFAULT_MIN_ROWS,
} from '@/constants/chat.constants';
import type { UseRichPromptTextareaParams, UseRichPromptTextareaReturn } from '@/types';

/**
 * Owns the keyboard + autosize + IME glue for the shared RichPromptTextarea.
 * The component itself stays a pure render — all stateful behaviour lives here
 * so the .tsx file can be a single render expression with one controller hook
 * call, per the frontend rule "TSX files = render only".
 *
 * Responsibilities:
 *   - Track IME composition (compositionStart/End) so Enter never submits
 *     while a CJK/IME composition is in progress.
 *   - Resolve a single text-area ref the parent component attaches.
 *   - Auto-grow the textarea between minRows and maxRows by measuring
 *     scrollHeight after every value change. Past maxRows the textarea
 *     keeps its capped height and scrolls internally.
 *   - Provide a stable onKeyDown handler that runs the submit contract:
 *     plain Enter → onSubmit (if value non-empty after trim and !disabled),
 *     Shift+Enter → default newline, anything during composition → default.
 *   - Provide a forwarder for compositionStart/End and onChange so the
 *     component just spreads what the hook returns.
 */
export function useRichPromptTextarea(
  params: UseRichPromptTextareaParams,
): UseRichPromptTextareaReturn {
  const {
    value,
    onChange,
    onSubmit,
    disabled = false,
    minRows = RICH_PROMPT_DEFAULT_MIN_ROWS,
    maxRows = RICH_PROMPT_DEFAULT_MAX_ROWS,
  } = params;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isComposingRef = useRef(false);
  const [lineHeightPx, setLineHeightPx] = useState<number | null>(null);
  // True once the user has manually drag-resized the textarea — at that
  // point we stop auto-growing and let the user own the height. Reset to
  // false when the value clears (submit / external reset) so autosize
  // resumes for the next message.
  const userResizedRef = useRef(false);
  // The most recent height that the autosize effect wrote. We compare this
  // to ResizeObserver reports — any divergence > 1 px means the user
  // dragged the native resize handle.
  const lastAutoHeightRef = useRef<number | null>(null);

  // Measure the textarea's computed line-height ONCE the ref is attached so we
  // can translate minRows/maxRows into a pixel min-height / max-height. We
  // also re-measure if the font (and therefore line-height) changes via a
  // ResizeObserver-less heuristic: the effect re-runs whenever the value
  // changes, which is a superset of font-load events on first render.
  useEffect(() => {
    const el = textareaRef.current;
    if (el === null) {
      return;
    }
    if (lineHeightPx === null) {
      const computed = globalThis.getComputedStyle(el);
      const parsed = Number.parseFloat(computed.lineHeight);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setLineHeightPx(parsed);
      }
    }
  }, [lineHeightPx, value]);

  // Auto-resize: reset height to auto, then size to scrollHeight clamped to
  // [minRows*lineHeight, maxRows*lineHeight]. Past the upper bound the
  // textarea is capped and its overflow-y kicks in (default browser scroll).
  // Once the user manually drag-resizes the handle, autosize defers — the
  // user owns the height until the value clears.
  useEffect(() => {
    const el = textareaRef.current;
    if (el === null || lineHeightPx === null) {
      return;
    }
    // When the value goes empty (post-submit / external reset), let autosize
    // take over again so the next message starts from the configured min.
    if (value.length === 0) {
      userResizedRef.current = false;
    }
    if (userResizedRef.current) {
      return;
    }
    const minPx = Math.round(minRows * lineHeightPx);
    const maxPx = Math.round(maxRows * lineHeightPx);
    // Reset first so shrinks work — without this, height only ever grows.
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, minPx), maxPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxPx ? 'auto' : 'hidden';
    lastAutoHeightRef.current = next;
  }, [value, minRows, maxRows, lineHeightPx]);

  // Watch for manual drag-resize. When the rendered height diverges from the
  // last autosize-applied height, the user dragged the native handle —
  // latch userResizedRef so subsequent autosize passes stop fighting them.
  useEffect(() => {
    const el = textareaRef.current;
    if (el === null) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const currentHeight = el.getBoundingClientRect().height;
      const autoHeight = lastAutoHeightRef.current;
      if (autoHeight !== null && Math.abs(currentHeight - autoHeight) > 1) {
        userResizedRef.current = true;
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      // React surfaces a synthetic `isComposing` flag on KeyboardEvent in some
      // browsers, but it isn't universal. We also keep our own ref toggled by
      // compositionStart/End for full coverage.
      const composing = isComposingRef.current || e.nativeEvent.isComposing;
      if (e.key !== 'Enter' || e.shiftKey || composing) {
        return;
      }
      if (disabled) {
        // Don't submit when disabled, and don't let the textarea insert a
        // newline either — the field is supposed to be inert.
        e.preventDefault();
        return;
      }
      if (onSubmit === undefined) {
        return;
      }
      if (value.trim().length === 0) {
        // Treat empty/whitespace-only as a no-op submit; suppress the newline
        // so the user doesn't end up with leading blank lines they didn't ask
        // for.
        e.preventDefault();
        return;
      }
      e.preventDefault();
      onSubmit();
    },
    [disabled, onSubmit, value],
  );

  const handleCompositionStart = useCallback((): void => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((): void => {
    isComposingRef.current = false;
  }, []);

  return {
    textareaRef,
    handleChange,
    handleKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
  };
}
