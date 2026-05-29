import {
  THINKING_CLOSE_TAGS,
  THINKING_MAX_TAG_LENGTH,
  THINKING_OPEN_TAGS,
} from '../constants/thinking-scanner.constants';
import { type ScannedFragment } from '../types/thinking-scanner.types';

// Streaming-safe scanner that splits model-emitted <think>...</think> blocks
// (and <thinking>/<reasoning>/<thought> variants) out of the answer content.
// It maintains parser state across chunks so an opening or closing tag split
// across two chunks (e.g. "<thi" then "nk>") is still recognized. The trailing
// buffer is capped at the longest tag length to prevent memory abuse.
export class ThinkingFragmentScanner {
  private inReasoning = false;
  private pending = '';

  push(chunk: string): ScannedFragment {
    const text = this.pending + chunk;
    this.pending = '';
    const lower = text.toLowerCase();

    let index = 0;
    let content = '';
    let reasoning = '';

    while (index < text.length) {
      const tags = this.inReasoning ? THINKING_CLOSE_TAGS : THINKING_OPEN_TAGS;
      const match = this.findEarliestTag(lower, index, tags);

      if (match === null) {
        const safeEnd = this.findSafeEnd(lower, index, tags);
        const emitted = text.slice(index, safeEnd);
        if (this.inReasoning) {
          reasoning += emitted;
        } else {
          content += emitted;
        }
        this.pending = text.slice(safeEnd);
        break;
      }

      const emitted = text.slice(index, match.index);
      if (this.inReasoning) {
        reasoning += emitted;
      } else {
        content += emitted;
      }
      index = match.index + match.length;
      this.inReasoning = !this.inReasoning;
    }

    return { content, reasoning };
  }

  // Flush any buffered tail at end-of-stream. A dangling partial tag is treated
  // as literal text in whatever mode the scanner ended in.
  flush(): ScannedFragment {
    const remainder = this.pending;
    this.pending = '';
    if (remainder.length === 0) {
      return { content: '', reasoning: '' };
    }
    return this.inReasoning
      ? { content: '', reasoning: remainder }
      : { content: remainder, reasoning: '' };
  }

  private findEarliestTag(
    lower: string,
    from: number,
    tags: readonly string[],
  ): { index: number; length: number } | null {
    let bestIndex = -1;
    let bestLength = 0;
    for (const tag of tags) {
      const found = lower.indexOf(tag, from);
      if (found !== -1 && (bestIndex === -1 || found < bestIndex)) {
        bestIndex = found;
        bestLength = tag.length;
      }
    }
    return bestIndex === -1 ? null : { index: bestIndex, length: bestLength };
  }

  // Returns the index up to which text can be safely emitted. If the tail of
  // the text is a proper prefix of any tag, that tail is held back (buffered)
  // so a tag split across chunks is not mistaken for content.
  private findSafeEnd(lower: string, from: number, tags: readonly string[]): number {
    const scanStart = Math.max(from, lower.length - THINKING_MAX_TAG_LENGTH + 1);
    for (let start = scanStart; start < lower.length; start++) {
      const suffix = lower.slice(start);
      if (this.isProperTagPrefix(suffix, tags)) {
        return start;
      }
    }
    return lower.length;
  }

  private isProperTagPrefix(suffix: string, tags: readonly string[]): boolean {
    if (suffix.length === 0 || suffix[0] !== '<') {
      return false;
    }
    return tags.some((tag) => tag.length > suffix.length && tag.startsWith(suffix));
  }
}
