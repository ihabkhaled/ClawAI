import { THINKING_REASONING_SEPARATOR } from '../constants/thinking-scanner.constants';
import { type ScannedFragment } from '../types/thinking-scanner.types';
import { type OllamaChatResponse } from '../types/execution.types';
import { StreamingReasoningSplitter } from './reasoning-splitter.utility';

/**
 * Splits a COMPLETE (buffered) model response into answer and reasoning.
 *
 * Same implementation as the live stream (`StreamingReasoningSplitter`, rule
 * 56), with an unbounded hold: the whole text is one decision, so GLM's
 * bare-closing-tag shape (`"…Be concise.</think>Same voice note, …"`, prod
 * 2026-09-25, OLLAMA / glm-5.3) is unambiguous — everything before the first
 * unquoted closing tag that precedes any opening tag is reasoning. Ordinary
 * `<think>…</think>` blocks and an unterminated trailing one are split the
 * same way the stream splits them. A closing tag quoted in inline code is left
 * alone. Content with no tag at all is returned byte-for-byte.
 */
export function splitBufferedReasoning(raw: string): ScannedFragment {
  const splitter = new StreamingReasoningSplitter(Number.POSITIVE_INFINITY);
  const head = splitter.push(raw);
  const tail = splitter.flush();
  if (!splitter.sawReasoningTag) {
    // No tag, or only a quoted one: nothing to split, not even whitespace.
    return { content: raw, reasoning: '' };
  }
  const reasoning = [head.reasoning, tail.reasoning]
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
