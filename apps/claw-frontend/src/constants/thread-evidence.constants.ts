/** Step codes of the extra research pass and of a blocked review (ADR-193), to their i18n keys. */
export const THREAD_EVIDENCE_FOUND_CODE = 'EVIDENCE_GAP_RESEARCH_DONE';

export const THREAD_EVIDENCE_STEP_MESSAGES: Readonly<
  Record<string, { messageKey: string; hintKey: string }>
> = {
  JUDGE_BLOCKED: {
    messageKey: 'chat.threadEvidenceStepBlocked',
    hintKey: 'chat.threadEvidenceHintBlocked',
  },
  CRITIC_BLOCKED: {
    messageKey: 'chat.threadEvidenceStepBlocked',
    hintKey: 'chat.threadEvidenceHintBlocked',
  },
  EVIDENCE_GAP_RESEARCH: {
    messageKey: 'chat.threadEvidenceStepLooking',
    hintKey: 'chat.threadEvidenceStepLooking',
  },
  EVIDENCE_GAP_RESEARCH_DONE: {
    messageKey: 'chat.threadEvidenceStepFound',
    hintKey: 'chat.threadEvidenceStepFound',
  },
  EVIDENCE_GAP_RESEARCH_EMPTY: {
    messageKey: 'chat.threadEvidenceStepEmpty',
    hintKey: 'chat.threadEvidenceStepEmpty',
  },
  EVIDENCE_GAP_RESEARCH_FAILED: {
    messageKey: 'chat.threadEvidenceStepFailed',
    hintKey: 'chat.threadEvidenceStepFailed',
  },
  EVIDENCE_GAP_RESEARCH_SPEND_CAP: {
    messageKey: 'chat.threadEvidenceStepSpend',
    hintKey: 'chat.threadEvidenceStepSpend',
  },
};

/** Review steps whose excerpt is a verdict (score, minimum, blockers), not the AI's own words. */
export const THREAD_REVIEW_VERDICT_CODES: ReadonlySet<string> = new Set([
  'JUDGE_BLOCKED',
  'CRITIC_BLOCKED',
  'JUDGE_SCORE_LOW',
  'CRITIC_SCORE_LOW',
]);

export const THREAD_EVIDENCE_REASON_GAP_KEY = 'chat.threadEvidenceReasonGap';
export const THREAD_EVIDENCE_REASON_BLOCKED_KEY = 'chat.threadEvidenceReasonBlocked';
export const THREAD_EVIDENCE_RESEARCH_MORE_KEY = 'chat.threadEvidenceRemedyResearchMore';
export const THREAD_EVIDENCE_NARROW_KEY = 'chat.threadEvidenceRemedyNarrow';
