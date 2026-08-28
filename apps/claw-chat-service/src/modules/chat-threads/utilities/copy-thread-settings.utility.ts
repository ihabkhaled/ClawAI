import type { ChatThread } from '../../../generated/prisma';
import type { CreateThreadData } from '../types/chat-threads.types';

/**
 * Carries a thread's settings onto a copy of it.
 *
 * Every field is omitted rather than passed as `null` when the source has none,
 * because `CreateThreadData` treats absent as "use the column default" while
 * `null` would be an explicit unset — and for `temperature` those differ: the
 * default is 0.7, not none.
 *
 * Identity and history are deliberately not copied. The caller decides the
 * owner, and messages are copied separately with fresh identifiers.
 */
export function copyThreadSettings(source: ChatThread): Omit<CreateThreadData, 'userId'> {
  return {
    ...(source.title === null ? {} : { title: source.title }),
    routingMode: source.routingMode,
    ...(source.systemPrompt === null ? {} : { systemPrompt: source.systemPrompt }),
    ...(source.temperature === null ? {} : { temperature: source.temperature }),
    ...(source.maxTokens === null ? {} : { maxTokens: source.maxTokens }),
    ...(source.preferredProvider === null ? {} : { preferredProvider: source.preferredProvider }),
    ...(source.preferredModel === null ? {} : { preferredModel: source.preferredModel }),
    contextPackIds: source.contextPackIds,
  };
}
