import {
  THINKING_CLOSE_TAGS,
  THINKING_INLINE_CODE_MARK,
  THINKING_OPEN_TAGS,
  THINKING_REASONING_SEPARATOR,
} from '../constants/thinking-scanner.constants';
import { type ScannedFragment } from '../types/thinking-scanner.types';
import { type OllamaChatResponse } from '../types/execution.types';
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

/**
 * Splits a COMPLETE (buffered) model response into answer and reasoning.
 *
 * The streaming `ThinkingFragmentScanner` only ever looks for an OPENING tag
 * while outside a block, which is right for a stream but misses the shape GLM
 * (and other templates that inject `<think>` into the prompt) actually
 * produce: the output starts inside the reasoning, so the only tag in it is
 * a bare `</think>`. Prod 2026-09-25, OLLAMA / glm-5.3: the stored answer was
 * `"…I still can't transcribe it. Be concise.</think>Same voice note, …"`, and
 * because the markdown renderer drops the unknown element the user read the
 * model's private notes run straight into its reply.
 *
 * With the whole text in hand that case is unambiguous: a closing tag that
 * appears before any opening tag ends a reasoning block that began at the
 * first byte. After that, ordinary `<think>…</think>` blocks (and an
 * unterminated trailing one) are handled by the same scanner the stream uses.
 * A closing tag quoted in inline code is left alone. Content with no tag at
 * all is returned byte-for-byte.
 */
export function splitBufferedReasoning(raw: string): ScannedFragment {
  const lower = raw.toLowerCase();
  const close = earliestTag(lower, THINKING_CLOSE_TAGS);
  const open = earliestTag(lower, THINKING_OPEN_TAGS);
  const isOrphanClose =
    close !== null &&
    (open === null || close.index < open.index) &&
    raw.charAt(close.index - 1) !== THINKING_INLINE_CODE_MARK;
  if (open === null && !isOrphanClose) {
    // No tag, or only a quoted one: nothing to split, not even whitespace.
    return { content: raw, reasoning: '' };
  }

  const pieces: string[] = [];
  let rest = raw;
  if (close !== null && isOrphanClose) {
    pieces.push(raw.slice(0, close.index));
    rest = raw.slice(close.index + close.length);
  }

  const scanner = new ThinkingFragmentScanner();
  const head = scanner.push(rest);
  const tail = scanner.flush();
  pieces.push(head.reasoning, tail.reasoning);

  const reasoning = pieces
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)
    .join(THINKING_REASONING_SEPARATOR);
  return { content: (head.content + tail.content).trim(), reasoning };
}

/**
 * One Ollama `/api/chat` message split into answer and reasoning: the inline
 * split above, plus Ollama's separate `message.thinking` field (which comes
 * first — it is what the model thought before writing anything).
 */
export function splitOllamaMessageReasoning(
  message: OllamaChatResponse['message'],
): ScannedFragment {
  const inline = splitBufferedReasoning(message?.content ?? '');
  const reasoning = [message?.thinking ?? '', inline.reasoning]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(THINKING_REASONING_SEPARATOR);
  return { content: inline.content, reasoning };
}
