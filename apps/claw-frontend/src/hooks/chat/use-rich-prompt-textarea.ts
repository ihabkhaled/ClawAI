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
 *   - ArrowUp / ArrowDown walk `recallHistory` (the user's own past messages,
 *     most recent first) the way a shell does: up goes older, down goes newer,
 *     and down past the newest restores the empty composer.
 *
 *     Recall STARTS only from an empty composer and CONTINUES only while the
 *     field still holds exactly what was recalled. Once there is a draft, or
 *     once the user edits a recalled message, the arrows go back to moving the
 *     caret — otherwise a multi-line prompt becomes uneditable and typed work
 *     disappears on a keystroke.
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
    recallHistory,
    allowEmptySubmit = false,
  } = params;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isComposingRef = useRef(false);
  // How far back in the user's own history the composer is currently showing.
  // -1 means "not recalling" — the field holds a live draft, not a past message.
  //
  // The recalled TEXT is tracked alongside it so the next key press can tell an
  // untouched recall from one the user has started editing. Without that, a
  // second ArrowUp would silently discard their edit.
  const recallIndexRef = useRef(-1);
  const recalledTextRef = useRef<string | null>(null);
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
      // Typing ends the recall. From here the field is a draft again, so the
      // next ArrowUp starts from the most recent message rather than resuming
      // wherever the user had walked to.
      if (e.target.value !== recalledTextRef.current) {
        recallIndexRef.current = -1;
        recalledTextRef.current = null;
      }
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
      if (composing) {
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Shell-style history. A modifier means the user is selecting or
        // jumping, never recalling.
        if (
          disabled ||
          recallHistory === undefined ||
          recallHistory.length === 0 ||
          e.shiftKey ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey
        ) {
          return;
        }

        // Recall may only start from an EMPTY composer, and may only CONTINUE
        // while the field still holds exactly what was recalled into it. Both
        // halves matter: the first keeps ArrowUp as caret movement inside a
        // draft, and the second means that the moment the user edits a recalled
        // message, the arrows go back to moving the caret through it rather
        // than throwing the edit away.
        const isRecalling = recallIndexRef.current >= 0;
        const isUntouched = isRecalling && value === recalledTextRef.current;
        if (!(value.length === 0 && !isRecalling) && !isUntouched) {
          return;
        }

        // ArrowDown only walks a recall that is already in progress. In a fresh
        // composer there is nothing newer to go to, and swallowing the key
        // there would take ArrowDown away from the caret for no gain.
        if (!isRecalling && e.key === 'ArrowDown') {
          return;
        }

        const nextIndex =
          e.key === 'ArrowUp' ? recallIndexRef.current + 1 : recallIndexRef.current - 1;
        if (nextIndex >= recallHistory.length) {
          // Already at the oldest message. Swallow the key rather than letting
          // the caret jump to the top of a long recalled prompt, which reads as
          // the history having skipped an entry.
          e.preventDefault();
          return;
        }

        e.preventDefault();
        if (nextIndex < 0) {
          // Past the newest entry: back to the empty composer the recall
          // started from.
          recallIndexRef.current = -1;
          recalledTextRef.current = null;
          onChange('');
          return;
        }
        const recalled = recallHistory[nextIndex] ?? '';
        recallIndexRef.current = nextIndex;
        recalledTextRef.current = recalled;
        onChange(recalled);
        return;
      }
      if (e.key !== 'Enter' || e.shiftKey) {
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
      if (value.trim().length === 0 && !allowEmptySubmit) {
        // Treat empty/whitespace-only as a no-op submit; suppress the newline
        // so the user doesn't end up with leading blank lines they didn't ask
        // for.
        e.preventDefault();
        return;
      }
      e.preventDefault();
      onSubmit();
    },
    [allowEmptySubmit, disabled, onChange, onSubmit, recallHistory, value],
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
