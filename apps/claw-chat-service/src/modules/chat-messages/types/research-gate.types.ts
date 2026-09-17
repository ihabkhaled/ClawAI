/** The classifier's decision about one user message. */
export type ResearchGateVerdict = {
  /** True only when answering genuinely needs information from the internet. */
  needsWeb: boolean;
  /** Short justification, logged so a wrong verdict can be traced to its cause. */
  reason: string;
};

/** The only field the gate reads back from the runtime's generate endpoint. */
export type ResearchGateModelReply = {
  response?: string;
};

export interface ResearchGateCacheEntry {
  verdict: ResearchGateVerdict;
  expiresAt: number;
}

/** One configured classifier candidate, as routing-service serves it. */
export interface ResearchGateCandidate {
  provider: string;
  modelAlias: string;
  timeoutMs: number;
  maxTokens: number;
}
