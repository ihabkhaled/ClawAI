import {
  REASONING_BLOCK_PATTERN,
  REASONING_CLOSE_PATTERN,
  REASONING_OPEN_PATTERN,
} from '../constants/output-retry.constants';
import type { ReasoningStripped } from '../types/reasoning-stripped.types';

/**
 * Removes `<think>...</think>` style blocks so the answer after them can be read. A closing tag
 * with no opening one (some servers drop the opening tag) ends everything before it; an opening
 * tag that never closes means the model ran out of output while still thinking, so nothing after
 * it is an answer.
 */
export function stripReasoningBlocks(text: string): ReasoningStripped {
  let answer = text.replaceAll(REASONING_BLOCK_PATTERN, '');
  const closings = [...answer.matchAll(REASONING_CLOSE_PATTERN)];
  const lastClosing = closings.at(-1);
  if (lastClosing) answer = answer.slice(lastClosing.index + lastClosing[0].length);
  const opening = REASONING_OPEN_PATTERN.exec(answer);
  return {
    answer: (opening ? answer.slice(0, opening.index) : answer).trim(),
    unfinished: opening !== null,
  };
}
