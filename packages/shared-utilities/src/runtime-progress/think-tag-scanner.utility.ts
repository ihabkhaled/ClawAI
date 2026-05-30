/**
 * Options accepted by {@link ThinkTagScanner}. The default tag set is
 * `['think', 'thinking', 'reasoning']` which covers the three families of
 * inline-reasoning markup we have seen across Ollama/llama.cpp models.
 */
export type ThinkTagScannerOptions = {
  tags?: ReadonlyArray<string>;
};

/**
 * Result of a single `push` or `drain` call. Either field may be an empty
 * string if no progress was made on that side during the call.
 */
export type ThinkTagScannerSlice = {
  reasoning: string;
  content: string;
};

const DEFAULT_TAGS: ReadonlyArray<string> = ['think', 'thinking', 'reasoning'];

/**
 * Stateful, streaming-safe scanner that separates inline `<think>…</think>`
 * (or `<thinking>`, `<reasoning>`) blocks from the surrounding visible
 * content. Chunks may arrive with opening or closing tags split across
 * arbitrary byte boundaries (e.g. `<thi` then `nk>`); the scanner buffers
 * just enough trailing text to recognize partial markers without ever
 * emitting them as content or reasoning.
 *
 * Once an opening tag has been recognized, every byte up to (but not
 * including) the matching closing tag is appended to the next `reasoning`
 * slice. Everything outside reasoning blocks is forwarded as `content`.
 *
 * `drain()` flushes any buffered text that has not yet been classified —
 * if a reasoning block was left open, the remaining buffered text is
 * emitted as reasoning so callers do not silently lose the tail.
 */
export class ThinkTagScanner {
  private readonly tags: ReadonlyArray<string>;

  private readonly maxTagLength: number;

  private buffer: string;

  private insideReasoning: boolean;

  public constructor(options?: ThinkTagScannerOptions) {
    const incoming = options?.tags;
    this.tags =
      incoming && incoming.length > 0 ? incoming.map((t) => t.toLowerCase()) : DEFAULT_TAGS;
    // The longest possible suspended-tag prefix we may need to hold back is
    // `</tag>` minus one byte. We buffer up to that length to recognize
    // partial markers across chunk boundaries.
    this.maxTagLength = this.tags.reduce((max, tag) => Math.max(max, tag.length + 3), 0);
    this.buffer = '';
    this.insideReasoning = false;
  }

  /**
   * Feed the next streaming chunk to the scanner. Returns the reasoning and
   * content text recovered from the combined `buffer + chunk` minus any
   * trailing bytes that are being held back because they could still grow
   * into a recognized tag.
   */
  public push(chunk: string): ThinkTagScannerSlice {
    if (typeof chunk !== 'string' || chunk.length === 0) {
      return { reasoning: '', content: '' };
    }
    this.buffer += chunk;
    return this.consume(false);
  }

  /**
   * Flush any buffered text. Call this exactly once after the upstream
   * stream has ended. If a reasoning block was left open, the remaining
   * buffer is emitted as `reasoning`; otherwise it is emitted as `content`.
   */
  public drain(): ThinkTagScannerSlice {
    return this.consume(true);
  }

  private consume(isFinal: boolean): ThinkTagScannerSlice {
    let reasoning = '';
    let content = '';

    // Walk through the buffer pulling out as much classified text as
    // possible while keeping any potentially-partial tag bytes in the
    // buffer for the next push. The loop terminates as soon as we hit a
    // path that cannot make further progress without more input.
    let progressing = true;
    while (progressing) {
      progressing = false;
      if (this.insideReasoning) {
        const closeIndex = this.findClosingTag(this.buffer);
        if (closeIndex.found) {
          reasoning += this.buffer.slice(0, closeIndex.start);
          this.buffer = this.buffer.slice(closeIndex.end);
          this.insideReasoning = false;
          progressing = true;
          continue;
        }
        // No close tag yet. Keep enough trailing bytes to potentially
        // match `</tag` in the next chunk; emit everything before that.
        // On drain (isFinal=true) we keep nothing — the remaining buffer
        // is committed as reasoning so callers never lose the tail.
        const keep = isFinal ? 0 : this.suspendedTailLength();
        if (this.buffer.length > keep) {
          reasoning += this.buffer.slice(0, this.buffer.length - keep);
          this.buffer = this.buffer.slice(this.buffer.length - keep);
        }
        break;
      }

      const openIndex = this.findOpeningTag(this.buffer);
      if (openIndex.found) {
        content += this.buffer.slice(0, openIndex.start);
        this.buffer = this.buffer.slice(openIndex.end);
        this.insideReasoning = true;
        progressing = true;
        continue;
      }
      // No open tag yet. Keep enough trailing bytes to potentially match
      // `<tag` in the next chunk; emit everything before that as content.
      // On drain (isFinal=true) keep is forced to 0, so all buffered
      // text is committed as content and the buffer ends empty.
      const keep = isFinal ? 0 : this.suspendedTailLength();
      if (this.buffer.length > keep) {
        content += this.buffer.slice(0, this.buffer.length - keep);
        this.buffer = this.buffer.slice(this.buffer.length - keep);
      }
      break;
    }

    return { reasoning, content };
  }

  private findOpeningTag(haystack: string): { found: boolean; start: number; end: number } {
    let bestStart = -1;
    let bestEnd = -1;
    for (const tag of this.tags) {
      const needle = `<${tag}>`;
      const idx = haystack.toLowerCase().indexOf(needle);
      if (idx !== -1 && (bestStart === -1 || idx < bestStart)) {
        bestStart = idx;
        bestEnd = idx + needle.length;
      }
    }
    if (bestStart === -1) {
      return { found: false, start: -1, end: -1 };
    }
    return { found: true, start: bestStart, end: bestEnd };
  }

  private findClosingTag(haystack: string): { found: boolean; start: number; end: number } {
    let bestStart = -1;
    let bestEnd = -1;
    for (const tag of this.tags) {
      const needle = `</${tag}>`;
      const idx = haystack.toLowerCase().indexOf(needle);
      if (idx !== -1 && (bestStart === -1 || idx < bestStart)) {
        bestStart = idx;
        bestEnd = idx + needle.length;
      }
    }
    if (bestStart === -1) {
      return { found: false, start: -1, end: -1 };
    }
    return { found: true, start: bestStart, end: bestEnd };
  }

  /**
   * Determine how many trailing bytes might still grow into a recognized
   * tag and therefore must be withheld from the current emission. We keep
   * at most `maxTagLength - 1` bytes; never withholding the full tag
   * because if the tag is fully present we would already have matched it.
   */
  private suspendedTailLength(): number {
    if (this.buffer.length === 0) {
      return 0;
    }
    const window = Math.min(this.buffer.length, this.maxTagLength - 1);
    const tail = this.buffer.slice(this.buffer.length - window).toLowerCase();
    // Find the smallest tail length such that the substring beginning at
    // that offset is a prefix of either `<tag>` or `</tag>` for any known
    // tag. We start from the largest possible suspension and shrink so we
    // hold the shortest possible tail.
    for (let suspend = tail.length; suspend > 0; suspend -= 1) {
      const candidate = tail.slice(tail.length - suspend);
      if (this.isTagPrefix(candidate)) {
        return suspend;
      }
    }
    return 0;
  }

  private isTagPrefix(candidate: string): boolean {
    if (candidate.length === 0) {
      return false;
    }
    for (const tag of this.tags) {
      const openMarker = `<${tag}>`;
      const closeMarker = `</${tag}>`;
      if (openMarker.startsWith(candidate)) {
        return true;
      }
      if (closeMarker.startsWith(candidate)) {
        return true;
      }
    }
    return false;
  }
}
