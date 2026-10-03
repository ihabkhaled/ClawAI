import type { InsertedNewline } from '@/types';

/**
 * Splice a newline into `value`, replacing the current selection.
 *
 * Browsers insert a newline for Shift+Enter on their own but not for
 * Ctrl+Enter, so the composer does it by hand and puts the caret after it.
 */
export function insertNewlineAtSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): InsertedNewline {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  return {
    value: `${value.slice(0, start)}\n${value.slice(end)}`,
    caret: start + 1,
  };
}
