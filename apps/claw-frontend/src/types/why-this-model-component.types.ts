import type { ChatMessage } from './chat.types';

export type WhyThisModelPanelProps = {
  message: ChatMessage;
};

export type ThreadContextInspectorProps = {
  messageId: string;
};

export type DecisionDetailDrawerProps = {
  decisionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
