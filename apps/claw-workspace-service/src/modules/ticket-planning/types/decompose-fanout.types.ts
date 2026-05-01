export type Subtask = {
  title: string;
  descriptionDraft: string;
  estimateTshirt?: string;
  estimateConfidence?: number;
  dependencies?: string[];
};

export type DecomposeDraft = {
  subtasks?: Subtask[];
  rationale?: string;
};

export type FanoutResult = {
  parentQueueId: string;
  createdQueueIds: string[];
  skippedCount: number;
};
