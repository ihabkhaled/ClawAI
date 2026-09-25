/** Everything the AUTO research loop needs for one user turn. */
export type ResearchOrchestrationInput = {
  userId: string;
  userToken: string;
  threadId: string;
  intent: string;
  providerId?: string;
  forcedProvider?: string;
  forcedModel?: string;
  /**
   * Multimodal batch 8 — a short, bounded digest of the attachments' derived
   * text (transcript / OCR) for the planner. Absent when there is none.
   */
  attachmentDigest?: string;
};
