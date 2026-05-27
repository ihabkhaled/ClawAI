export type FollowUpDetection = {
  isFollowUp: boolean;
  // Human-readable labels of every matched signal, useful for the future
  // routing decision detail UI (Phase 8) — "make_it_x", "translate",
  // "short_reply", "pronoun:it", etc.
  signals: string[];
  confidence: number;
};
