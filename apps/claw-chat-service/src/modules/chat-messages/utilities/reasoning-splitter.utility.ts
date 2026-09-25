import {
  THINKING_CLOSE_TAGS,
  THINKING_INLINE_CODE_MARK,
  THINKING_OPEN_TAGS,
  THINKING_REASONING_SEPARATOR,
  THINKING_STREAM_HOLD_MAX_CHARS,
} from '../constants/thinking-scanner.constants';
import { type ScannedFragment } from '../types/thinking-scanner.types';
import { ThinkingFragmentScanner } from './thinking-fragment-scanner.utility';

function earliestTag(
  lower: string,
  tags: readonly string[],
): { index: number; length: number } | null {
  let best: { index: number; length: number } | null = null;
  for (const tag of tags) {
    const index = lower.indexOf(tag);
    if (index !== -1 && (best === null || index < best.index)) {
      best = { index, length: tag.length };
    }
  }
  return best;
}

function isQuoted(text: string, index: number): boolean {
  return index > 0 && text.charAt(index - 1) === THINKING_INLINE_CODE_MARK;
}

function joinReasoning(first: string, second: string): string {
  if (second.length === 0) {
    return first;
  }
  return first.length === 0 ? second : `${first}${THINKING_REASONING_SEPARATOR}${second}`;
}

/**
 * THE answer/reasoning split (rule 56) — one implementation for a true stream,
 * a simulated replay and a complete buffered response.
 *
 * Every reasoning shape a model produces:
 *  - `<think>…</think>` (and `<thinking>`/`<reasoning>`/`<thought>`, any case,
 *    unterminated at the end) — delegated to `ThinkingFragmentScanner`;
 *  - GLM-style output that starts INSIDE the reasoning, so the only tag is a
 *    bare closing `</think>`: everything before it is reasoning;
 *  - a separate reasoning field (`reasoning` / `reasoning_content` /
 *    `thinking`) — the caller reports it with `noteReasoningChannel()`.
 *
 * The bare-closing-tag shape cannot be recognised once the text before the
 * tag has been emitted, so the start of the answer is HELD: nothing is
 * emitted as content until the splitter sees a closing tag (orphan →
 * reasoning), an opening tag, a reasoning-field delta, the end of the input,
 * or `holdMaxChars` of text (then it is an ordinary answer and flows through
 * unchanged). A buffered caller passes an unbounded hold, which makes the
 * whole text one decision.
 *
 * A closing tag quoted in inline code (`` `</think>` ``) is text.
 */
export class StreamingReasoningSplitter {
  private readonly scanner = new ThinkingFragmentScanner();
  private held = '';
  private deciding = true;
  private trimNextContent = false;
  private tagSeen = false;
  private boundRelease = false;

  constructor(private readonly holdMaxChars: number = THINKING_STREAM_HOLD_MAX_CHARS) {}

  /** True once any reasoning tag (open, or a bare close) decided the split. */
  get sawReasoningTag(): boolean {
    return this.tagSeen;
  }

  /**
   * True when the hold ran out with no tag and no reasoning field: the text
   * was released as an ordinary answer. Only then can a bare `</think>` still
   * turn up later — the case the end-of-stream re-split exists for.
   */
  get releasedWithoutEvidence(): boolean {
    return this.boundRelease;
  }

  push(chunk: string): ScannedFragment {
    if (!this.deciding) {
      return this.trimmed(this.scanner.push(chunk));
    }
    this.held += chunk;
    return this.decide();
  }

  /**
   * The provider sent reasoning in its own FIELD, so it separates reasoning
   * from the answer: whatever content is being held is answer text.
   */
  noteReasoningChannel(): ScannedFragment {
    return this.deciding ? this.release() : { content: '', reasoning: '' };
  }

  /** End of input: release anything held, then the scanner's tail. */
  flush(): ScannedFragment {
    const head = this.deciding ? this.release() : { content: '', reasoning: '' };
    const tail = this.trimmed(this.scanner.flush());
    return {
      content: head.content + tail.content,
      reasoning: head.reasoning + tail.reasoning,
    };
  }

  private decide(): ScannedFragment {
    const lower = this.held.toLowerCase();
    const open = earliestTag(lower, THINKING_OPEN_TAGS);
    const close = earliestTag(lower, THINKING_CLOSE_TAGS);
    if (
      close !== null &&
      (open === null || close.index < open.index) &&
      !isQuoted(this.held, close.index)
    ) {
      return this.splitAtOrphanClose(close.index, close.length);
    }
    if (open !== null) {
      this.tagSeen = true;
      return this.release();
    }
    if (this.held.length >= this.holdMaxChars) {
      this.boundRelease = true;
      return this.release();
    }
    return { content: '', reasoning: '' };
  }

  private splitAtOrphanClose(index: number, length: number): ScannedFragment {
    this.tagSeen = true;
    this.deciding = false;
    this.trimNextContent = true;
    const orphan = this.held.slice(0, index).trim();
    const rest = this.held.slice(index + length);
    this.held = '';
    const after = this.trimmed(this.scanner.push(rest));
    return { content: after.content, reasoning: joinReasoning(orphan, after.reasoning.trim()) };
  }

  private release(): ScannedFragment {
    this.deciding = false;
    const text = this.held;
    this.held = '';
    return this.trimmed(this.scanner.push(text));
  }

  // After an orphan close the answer usually starts with "\n\n"; drop that
  // leading whitespace once so the reply does not open on a blank line.
  private trimmed(fragment: ScannedFragment): ScannedFragment {
    if (!this.trimNextContent || fragment.content.length === 0) {
      return fragment;
    }
    const content = fragment.content.trimStart();
    if (content.length > 0) {
      this.trimNextContent = false;
    }
    return { content, reasoning: fragment.reasoning };
  }
}
