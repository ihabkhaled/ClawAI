import type { ChatLimitKind } from '@/enums/chat-limit-kind.enum';

/**
 * A limit refusal, rendered as a line in the conversation.
 *
 * Render-only, never persisted: the 429 is raised before the user's message row
 * exists, so there is nothing to attach it to, and a stale "you hit your limit,
 * upgrade" sitting in the history of somebody who upgraded twenty minutes ago is
 * worse than no record at all.
 */
export interface ChatLimitNotice {
  kind: ChatLimitKind;
  titleKey: string;
  bodyKey: string;
  showUpgrade: boolean;
}
