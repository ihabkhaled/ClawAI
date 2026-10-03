import type { NamedModelNoticePayload, NamedModelNoticeReason } from '@claw/shared-types';
import { NAMED_MODEL_NOTICE_REASONS } from '../constants/named-model.constants';
import type { AssembledContext } from '../types/context.types';
import { withContextSaveNote } from './context-save-note.utility';

/** `{ namedModelPrompt }` / `{ namedModelNotice }` from a message.routed payload; `{}` when absent or unreadable. */
export function namedModelFields(
  prompt: unknown,
  notice: unknown,
): { namedModelPrompt?: string; namedModelNotice?: NamedModelNoticePayload } {
  const parsed = parseNotice(notice);
  return {
    ...(typeof prompt === 'string' && prompt.trim().length > 0 ? { namedModelPrompt: prompt } : {}),
    ...(parsed === null ? {} : { namedModelNotice: parsed }),
  };
}

function parseNotice(raw: unknown): NamedModelNoticePayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { phrase, provider, reason } = raw as Record<string, unknown>;
  return typeof phrase === 'string' && typeof provider === 'string' && isNoticeReason(reason)
    ? { phrase, provider, reason }
    : null;
}

function isNoticeReason(value: unknown): value is NamedModelNoticeReason {
  return typeof value === 'string' && Object.hasOwn(NAMED_MODEL_NOTICE_REASONS, value);
}

/**
 * The final user turn is what the target model answers, so it must read the
 * task, not the routing instruction ("use nano banana to"). Only the model's
 * copy changes: the stored message stays exactly what the user sent.
 */
export function withNamedModelPrompt(
  context: AssembledContext,
  prompt: string | undefined,
): AssembledContext {
  if (prompt === undefined || prompt.trim().length === 0) return context;
  const lastUser = context.threadMessages.reduce(
    (found, message, index) => (message.role === 'USER' ? index : found),
    -1,
  );
  if (lastUser < 0) return context;
  return {
    ...context,
    threadMessages: context.threadMessages.map((message, index) =>
      index === lastUser ? { ...message, content: prompt } : message,
    ),
  };
}

/** What the answering model is told when the model the user named could not be used. */
export function namedModelNoticeNote(notice: NamedModelNoticePayload): string {
  const reason = NAMED_MODEL_NOTICE_REASONS[notice.reason];
  return [
    `PLATFORM NOTICE — the user asked for "${notice.phrase}" (${notice.provider}), but it could not be used: ${reason}.`,
    'ClawAI answered with a different model instead of failing.',
    `Begin your reply with ONE short sentence, in the user's language, that names "${notice.phrase}" and says plainly it was not used and why, then answer the request normally. Do not claim to be ${notice.phrase}.`,
  ].join('\n');
}

/** The context with the notice in the system prompt and repeated on the final user turn. */
export function withNamedModelNotice(
  context: AssembledContext,
  notice: NamedModelNoticePayload | undefined,
): AssembledContext {
  return notice === undefined
    ? context
    : withContextSaveNote(context, namedModelNoticeNote(notice));
}
