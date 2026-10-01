import { repositoryRefSchema } from '../dto/repository-ref.dto';
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
 * The three privacy switches are copied too. A person who turned memory off in
 * a conversation turned it off for that conversation's content, and a branch
 * IS that content — defaulting them back on would quietly undo the choice.
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
    useMemory: source.useMemory,
    useContext: source.useContext,
    useCrossThreadContext: source.useCrossThreadContext,
    ...repositoryRefOf(source),
  };
}

/**
 * The repository a branch stays in. The stored JSON is parsed rather than cast,
 * so a value that no longer parses is left off the copy instead of being
 * written through.
 */
function repositoryRefOf(source: ChatThread): Pick<CreateThreadData, 'repositoryRef'> {
  if (source.repositoryRef === null) return {};
  const parsed = repositoryRefSchema.safeParse(source.repositoryRef);
  return parsed.success ? { repositoryRef: parsed.data } : {};
}
