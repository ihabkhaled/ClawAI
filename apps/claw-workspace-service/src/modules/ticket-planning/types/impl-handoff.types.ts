import type { ImplPromptHandoffMode, ImplPromptHandoffStatus } from '../../../generated/prisma';

export type HandoffPayload = {
  id: string;
  sourceQueueId: string;
  userId: string;
  mode: ImplPromptHandoffMode;
  targetThreadId: string | null;
  targetTerminalCommandId: string | null;
  status: ImplPromptHandoffStatus;
  errorMessage: string | null;
  briefSnippet: string;
  createdAt: string;
  deliveredAt: string | null;
};

export type CreateHandoffInput = {
  sourceQueueId: string;
  userId: string;
  mode: ImplPromptHandoffMode;
  brief: string;
};

export type ImplPromptDraftPayload = {
  brief: string;
  acceptanceCriteria?: string[];
  suggestedFiles?: string[];
  suggestedCommitFormat?: string;
  languageHints?: string[];
};

export type DecomposeDraftPayload = {
  rationale?: string;
  subtasks: Array<{
    title: string;
    descriptionDraft: string;
    estimateTshirt?: string;
    estimateConfidence?: number;
    dependencies?: string[];
  }>;
};
