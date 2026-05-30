import { ThinkTagScanner } from '@claw/shared-utilities';
import { SSE_EVENT_TERMINATOR } from '../constants/sse.constants';
import { type ChunkRewriteResult, type SseFrameDelta } from '../types/inference-proxy.types';

/**
 * Rewrite a chunk of upstream SSE bytes by running each `data:` frame's
 * `choices[].delta.content` through {@link ThinkTagScanner}. Any text inside
 * `<think>…</think>` is moved to `delta.reasoning_content`; the cleaned text
 * stays in `delta.content`.
 *
 * SSE frames are delimited by a blank line (`\n\n`). When `flush` is false
 * we keep any trailing partial frame in `leftover` for the next call. When
 * `flush` is true the entire buffer is processed even if the last frame is
 * not newline-terminated.
 *
 * Frames we cannot parse (comments, heartbeats, `[DONE]`, non-JSON, missing
 * `choices`, etc.) are passed through verbatim — never dropped.
 */
export function rewriteStreamingChunk(
  buffer: string,
  scanner: ThinkTagScanner,
  flush: boolean = false,
): ChunkRewriteResult {
  let rewritten = '';
  let cursor = 0;
  while (cursor < buffer.length) {
    const boundary = buffer.indexOf(SSE_EVENT_TERMINATOR, cursor);
    if (boundary === -1) {
      break;
    }
    const rawFrame = buffer.slice(cursor, boundary);
    cursor = boundary + SSE_EVENT_TERMINATOR.length;
    rewritten += rewriteOneFrame(rawFrame, scanner) + SSE_EVENT_TERMINATOR;
  }
  const trailing = buffer.slice(cursor);
  if (flush && trailing.length > 0) {
    return { rewritten: rewritten + rewriteOneFrame(trailing, scanner), leftover: '' };
  }
  return { rewritten, leftover: trailing };
}

function rewriteOneFrame(rawFrame: string, scanner: ThinkTagScanner): string {
  if (!rawFrame.includes('data:')) {
    return rawFrame;
  }
  const lines = rawFrame.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('data:')) {
      out.push(line);
      continue;
    }
    const prefixLength = line.length - trimmed.length;
    const prefix = line.slice(0, prefixLength);
    const payload = trimmed.slice('data:'.length).trim();
    if (payload === '[DONE]' || payload.length === 0) {
      out.push(line);
      continue;
    }
    const parsed = safeParseFrame(payload);
    if (!parsed) {
      out.push(line);
      continue;
    }
    const rewrittenFrame = applyScannerToFrame(parsed, scanner);
    out.push(`${prefix}data: ${JSON.stringify(rewrittenFrame)}`);
  }
  return out.join('\n');
}

function applyScannerToFrame(
  frame: Record<string, unknown>,
  scanner: ThinkTagScanner,
): Record<string, unknown> {
  const choices = frame['choices'];
  if (!Array.isArray(choices) || choices.length === 0) {
    return frame;
  }
  const firstChoice = choices[0];
  if (typeof firstChoice !== 'object' || firstChoice === null) {
    return frame;
  }
  const delta = (firstChoice as { delta?: unknown }).delta;
  if (typeof delta !== 'object' || delta === null) {
    return frame;
  }
  const rewrittenDelta = applyScannerToDelta(delta as SseFrameDelta, scanner);
  return {
    ...frame,
    choices: [
      { ...(firstChoice as Record<string, unknown>), delta: rewrittenDelta },
      ...choices.slice(1),
    ],
  };
}

function applyScannerToDelta(delta: SseFrameDelta, scanner: ThinkTagScanner): SseFrameDelta {
  if (typeof delta.content !== 'string' || delta.content.length === 0) {
    return delta;
  }
  const slice = scanner.push(delta.content);
  const rewritten: SseFrameDelta = { ...delta };
  if (slice.content.length > 0) {
    rewritten.content = slice.content;
  } else {
    delete rewritten.content;
  }
  if (slice.reasoning.length > 0) {
    const existing = typeof delta.reasoning_content === 'string' ? delta.reasoning_content : '';
    rewritten.reasoning_content = existing + slice.reasoning;
  }
  return rewritten;
}

function safeParseFrame(payload: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Rewrite a non-streaming OpenAI-compatible chat completion body so each
 * choice's `message.content` is scanned for `<think>…</think>` and the
 * inner text becomes `message.reasoning_content`. Unparseable bodies and
 * bodies without choices are returned verbatim — never throw, never drop.
 */
export function rewriteNonStreamingPayload(rawJson: string): string {
  const parsed = safeParseFrame(rawJson);
  if (!parsed) {
    return rawJson;
  }
  const choices = parsed['choices'];
  if (!Array.isArray(choices) || choices.length === 0) {
    return rawJson;
  }
  const rewrittenChoices = choices.map((choice) => rewriteChoiceMessage(choice));
  const next = { ...parsed, choices: rewrittenChoices };
  return JSON.stringify(next);
}

/**
 * Build a final synthetic SSE delta carrying any reasoning/content the
 * scanner is still holding once the upstream stream ends. Returns `null`
 * when both sides are empty (the common case — the scanner only holds
 * bytes when a tag boundary straddled a chunk that never closed).
 */
export function buildSyntheticTailFrame(reasoning: string, content: string): string | null {
  if (reasoning.length === 0 && content.length === 0) {
    return null;
  }
  const delta: Record<string, string> = {};
  if (reasoning.length > 0) {
    delta['reasoning_content'] = reasoning;
  }
  if (content.length > 0) {
    delta['content'] = content;
  }
  const frame = {
    choices: [
      {
        index: 0,
        delta,
        finish_reason: null,
      },
    ],
  };
  return `data: ${JSON.stringify(frame)}${SSE_EVENT_TERMINATOR}`;
}

function rewriteChoiceMessage(choice: unknown): unknown {
  if (typeof choice !== 'object' || choice === null) {
    return choice;
  }
  const message = (choice as { message?: unknown }).message;
  if (typeof message !== 'object' || message === null) {
    return choice;
  }
  const content = (message as { content?: unknown }).content;
  if (typeof content !== 'string' || content.length === 0) {
    return choice;
  }
  const scanner = new ThinkTagScanner();
  const slice = scanner.push(content);
  const tail = scanner.drain();
  const reasoning = slice.reasoning + tail.reasoning;
  const cleaned = slice.content + tail.content;
  const messageRec = message as Record<string, unknown>;
  const rewrittenMessage: Record<string, unknown> = {
    ...messageRec,
    content: cleaned,
  };
  if (reasoning.length > 0) {
    const existing =
      typeof messageRec['reasoning_content'] === 'string'
        ? (messageRec['reasoning_content'] as string)
        : '';
    rewrittenMessage['reasoning_content'] = existing + reasoning;
  }
  return { ...(choice as Record<string, unknown>), message: rewrittenMessage };
}
