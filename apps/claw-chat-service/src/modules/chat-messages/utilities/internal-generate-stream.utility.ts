import { HttpStatus } from '@nestjs/common';

import type { AiStreamProtocol } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import {
  INTERNAL_GENERATE_CODE_EMPTY_RESPONSE,
  INTERNAL_GENERATE_CODE_REASONED_NO_ANSWER,
  INTERNAL_GENERATE_RAW_BODY_CAP_CHARS,
} from '../constants/internal-generate.constants';
import type { FoldedProviderStream } from '../types/internal-generate-stream.types';
import { splitOllamaMessageReasoning } from './buffered-reasoning.utility';
import { ProviderStreamReader } from './provider-stream-reader.utility';
import type { NormalizedStreamFragment } from '../types/provider-stream.types';
import type { OllamaChatResponse } from '../types/execution.types';

/**
 * Reads a provider stream to its end and folds it into one answer.
 *
 * Provider-agnostic on purpose: the same reader the chat surfaces use turns
 * OpenAI-style SSE and Ollama NDJSON into fragments, so a thinking frame, an
 * answer token and the final usage frame all land here the same way. This is
 * the read/fold half of `ProviderStreamExecutor` without its chat-thread
 * emission, which an internal caller has no thread for.
 *
 * `onChunk` runs for every chunk the provider sent, BEFORE it is parsed, so a
 * keep-alive comment or a thinking frame counts as life. Nothing is invented:
 * if the provider is silent, `onChunk` is silent.
 */
export async function foldProviderStream(
  chunks: AsyncIterable<string>,
  protocol: AiStreamProtocol,
  onChunk: (chunkChars: number) => void,
): Promise<FoldedProviderStream> {
  const reader = new ProviderStreamReader(protocol);
  const folded = newFold();
  for await (const chunk of chunks) {
    onChunk(chunk.length);
    const fragments = reader.push(chunk);
    for (const fragment of fragments) {
      applyFragment(folded, fragment);
    }
    keepRawBody(folded, chunk);
  }
  for (const fragment of reader.flush()) {
    applyFragment(folded, fragment);
  }
  return folded;
}

function newFold(): FoldedProviderStream {
  return {
    content: '',
    thinking: '',
    toolCallCount: 0,
    sawFragment: false,
    rawBody: '',
  };
}

function applyFragment(folded: FoldedProviderStream, fragment: NormalizedStreamFragment): void {
  folded.sawFragment = true;
  if (fragment.kind === 'content') {
    folded.content += fragment.text;
    return;
  }
  if (fragment.kind === 'reasoning') {
    folded.thinking += fragment.text;
    return;
  }
  if (fragment.kind === 'usage') {
    // `??` and not a default: a provider that reports nothing stays absent, so
    // the settlement can tell "not measured" from a measured zero.
    folded.promptTokens = fragment.promptTokens ?? folded.promptTokens;
    folded.completionTokens = fragment.completionTokens ?? folded.completionTokens;
    folded.cachedPromptTokens = fragment.cachedPromptTokens ?? folded.cachedPromptTokens;
    folded.cacheCreationPromptTokens =
      fragment.cacheCreationPromptTokens ?? folded.cacheCreationPromptTokens;
    folded.reasoningTokens = fragment.reasoningTokens ?? folded.reasoningTokens;
    return;
  }
  if (fragment.kind === 'tool-calls') {
    folded.toolCallCount += fragment.calls.length;
    return;
  }
  folded.finishReason = fragment.finishReason ?? folded.finishReason;
}

/**
 * Keeps the raw text of a body that has produced no fragment yet.
 *
 * A provider that ignores `stream: true` answers with one plain JSON document,
 * which the SSE reader (it only reads `data:` lines) turns into nothing. The
 * raw text lets the caller recognise that and read it as a buffered reply
 * instead of reporting an empty answer. Once a fragment has been seen the
 * stream is a real one and nothing more is kept.
 */
function keepRawBody(folded: FoldedProviderStream, chunk: string): void {
  if (folded.sawFragment) {
    folded.rawBody = '';
    return;
  }
  if (folded.rawBody.length < INTERNAL_GENERATE_RAW_BODY_CAP_CHARS) {
    folded.rawBody += chunk;
  }
}

/** The answer and the reasoning, with inline thinking tags split out of the answer. */
export function resolveFoldedAnswer(folded: FoldedProviderStream): {
  content: string;
  reasoning: string;
} {
  return splitOllamaMessageReasoning({ content: folded.content, thinking: folded.thinking });
}

/**
 * Throws when a model produced no answer, naming WHY.
 *
 * "Reasoned but wrote nothing" (the output budget went on thinking) is a
 * different fault from "the provider returned an empty envelope", and a caller
 * retries them differently, so they carry different codes.
 */
export function assertAnswered(
  content: string,
  reasoning: string,
  provider: string,
  model: string,
): void {
  if (content.trim().length > 0) {
    return;
  }
  if (reasoning.trim().length > 0) {
    throw new BusinessException(
      `Model ${model} reasoned but produced no answer`,
      INTERNAL_GENERATE_CODE_REASONED_NO_ANSWER,
      HttpStatus.BAD_GATEWAY,
    );
  }
  throw new BusinessException(
    `Cloud provider ${provider} returned no message content`,
    INTERNAL_GENERATE_CODE_EMPTY_RESPONSE,
  );
}

/**
 * The same check for a buffered Ollama reply, before it is parsed.
 *
 * `parseOllamaChatResponse` serves every chat surface and throws one code for
 * both emptiness shapes; this endpoint tells them apart without changing it.
 */
export function assertOllamaReplyAnswered(
  data: OllamaChatResponse,
  provider: string,
  model: string,
): void {
  if ((data.message?.tool_calls?.length ?? 0) > 0) {
    return;
  }
  const { content, reasoning } = splitOllamaMessageReasoning(data.message);
  assertAnswered(content, reasoning, provider, model);
}

/** A JSON object parsed from text, or undefined when the text is anything else. */
export function parseJsonObject(text: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
