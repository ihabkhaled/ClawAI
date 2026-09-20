import { RUNTIME_V2_OUTPUT_RESERVE_TOKENS } from '../constants/runtime-v2-transcript.constants';

import type {
  RuntimeHistoryMessage,
  RuntimeThreadContext,
} from '../types/runtime-thread-context.types';
import type { ThreadSettings } from '../types/execution.types';

/**
 * The attachments the model should be given, from the latest user turn.
 *
 * The same rule ordinary chat uses: only the most recent user message's files.
 * Older attachments stay out because a thread that discussed six documents
 * would otherwise send all six on every turn, and the one just dropped in is
 * the one being asked about.
 */
export function latestUserFileIds(
  messages: readonly RuntimeHistoryMessage[],
): string[] | undefined {
  const latest = [...messages].reverse().find((message) => message.role === 'USER');
  const metadata = latest?.metadata as Record<string, unknown> | null;
  const fileIds = metadata?.['fileIds'];
  return Array.isArray(fileIds) && fileIds.length > 0 ? (fileIds as string[]) : undefined;
}

/**
 * The thread settings an agent run assembles its context with.
 *
 * Runtime runs used to pass `{ maxTokens }` and nothing else, so
 * `useCrossThreadContext` arrived as `undefined` and the assembler's
 * `=== true` test made it false for every coding-agent run. A user who had
 * turned "use relevant previous chats" on got it in chat and silently not in
 * the agent — the same account, the same setting, two different answers.
 *
 * `maxTokens` is the answer length and nothing else (ADR-086). The loop used
 * to pass the 96,000-token *context* budget here, which the budget resolver
 * clamps to its 32,768 ceiling — so every turn reserved 32,768 tokens for an
 * answer that is a tool call, and on a 32k-window model that took half the
 * window away from the history, memories and attachments it was meant to
 * protect.
 */
export function runtimeThreadSettings(thread: RuntimeThreadContext | null): ThreadSettings {
  return {
    maxTokens: RUNTIME_V2_OUTPUT_RESERVE_TOKENS,
    ...(thread === null
      ? {}
      : {
          useCrossThreadContext: thread.useCrossThreadContext,
          ...(thread.systemPrompt === null || thread.systemPrompt === undefined
            ? {}
            : { systemPrompt: thread.systemPrompt }),
        }),
  };
}
