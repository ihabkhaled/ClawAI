import type { ChatMessage } from './chat.types';
import type { RetrievalConversationSummary } from './context-receipt.types';

export type WhyThisModelPanelProps = {
  message: ChatMessage;
};

/**
 * Conversation half of the context receipt. Optional because a receipt written
 * before ADR-084 carries no conversation record at all.
 */
export type ContextInspectorConversationSectionProps = {
  conversation: RetrievalConversationSummary | undefined;
};

export type ThreadContextInspectorProps = {
  messageId: string;
};

export type DecisionDetailDrawerProps = {
  decisionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
