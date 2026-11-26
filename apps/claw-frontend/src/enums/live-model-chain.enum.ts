/** The three model lists of the Live policy; each value is the policy field it edits. */
export enum LiveModelChainKind {
  SUMMARY = 'summaryModelChain',
  VISION = 'visionModelChain',
  COUNCIL = 'councilModelChain',
}

/** How claw-live-service talks to a connector (`liveModelRefSchema.style`). */
export enum LiveModelStyle {
  OPENAI_COMPAT = 'OPENAI_COMPAT',
  OLLAMA = 'OLLAMA',
}

/** One step up or down a chain. */
export enum LiveModelChainDirection {
  UP = -1,
  DOWN = 1,
}
