import {
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadFailureRemedy,
  ThreadHealingResult,
  ThreadHealingStrategy,
} from '@claw/shared-types';

/** Phase of a generation (ADR-181) to the sentence part the panel shows. */
export const THREAD_PHASE_KEYS: Readonly<Record<ThreadFailurePhase, string>> = {
  [ThreadFailurePhase.QUEUE]: 'chat.threadProgress.recovery.phase.queue',
  [ThreadFailurePhase.SNAPSHOT]: 'chat.threadProgress.recovery.phase.snapshot',
  [ThreadFailurePhase.RESEARCH]: 'chat.threadProgress.recovery.phase.research',
  [ThreadFailurePhase.AUTHOR]: 'chat.threadProgress.recovery.phase.author',
  [ThreadFailurePhase.CITATIONS]: 'chat.threadProgress.recovery.phase.citations',
  [ThreadFailurePhase.CONSENSUS]: 'chat.threadProgress.recovery.phase.consensus',
  [ThreadFailurePhase.JUDGE]: 'chat.threadProgress.recovery.phase.judge',
  [ThreadFailurePhase.CRITIC]: 'chat.threadProgress.recovery.phase.critic',
  [ThreadFailurePhase.FINALIZE]: 'chat.threadProgress.recovery.phase.finalize',
};

/** One plain sentence per failure class: why the step failed. */
export const THREAD_CLASS_REASON_KEYS: Readonly<Record<ThreadFailureClass, string>> = {
  [ThreadFailureClass.PROVIDER_REJECTED]: 'chat.threadProgress.recovery.reason.providerRejected',
  [ThreadFailureClass.PROVIDER_RATE_LIMITED]:
    'chat.threadProgress.recovery.reason.providerRateLimited',
  [ThreadFailureClass.PROVIDER_UNAVAILABLE]:
    'chat.threadProgress.recovery.reason.providerUnavailable',
  [ThreadFailureClass.PROVIDER_TIMEOUT]: 'chat.threadProgress.recovery.reason.providerTimeout',
  [ThreadFailureClass.PROVIDER_CREDIT]: 'chat.threadProgress.recovery.reason.providerCredit',
  [ThreadFailureClass.NETWORK]: 'chat.threadProgress.recovery.reason.network',
  [ThreadFailureClass.EMPTY_OUTPUT]: 'chat.threadProgress.recovery.reason.emptyOutput',
  [ThreadFailureClass.TRUNCATED_OUTPUT]: 'chat.threadProgress.recovery.reason.truncatedOutput',
  [ThreadFailureClass.INVALID_JSON]: 'chat.threadProgress.recovery.reason.invalidJson',
  [ThreadFailureClass.WRONG_SHAPE]: 'chat.threadProgress.recovery.reason.wrongShape',
  [ThreadFailureClass.CITATION_RULE]: 'chat.threadProgress.recovery.reason.citationRule',
  [ThreadFailureClass.REFUSAL]: 'chat.threadProgress.recovery.reason.refusal',
  [ThreadFailureClass.CONTEXT_OVERFLOW]: 'chat.threadProgress.recovery.reason.contextOverflow',
  [ThreadFailureClass.PRICING_UNAVAILABLE]:
    'chat.threadProgress.recovery.reason.pricingUnavailable',
  [ThreadFailureClass.CAP_TOO_LOW]: 'chat.threadProgress.recovery.reason.capTooLow',
  [ThreadFailureClass.CREDIT_EXHAUSTED]: 'chat.threadProgress.recovery.reason.creditExhausted',
  [ThreadFailureClass.ENTITLEMENT]: 'chat.threadProgress.recovery.reason.entitlement',
  [ThreadFailureClass.RESEARCH_FAILED]: 'chat.threadProgress.recovery.reason.researchFailed',
  [ThreadFailureClass.REVIEW_NOT_PASSED]: 'chat.threadProgress.recovery.reason.reviewNotPassed',
  [ThreadFailureClass.QUEUE_WORKER]: 'chat.threadProgress.recovery.reason.queueWorker',
  [ThreadFailureClass.CANCELLED]: 'chat.threadProgress.recovery.reason.cancelled',
  [ThreadFailureClass.UNKNOWN]: 'chat.threadProgress.recovery.reason.unknown',
};

export const THREAD_REMEDY_LABEL_KEYS: Readonly<Record<ThreadFailureRemedy, string>> = {
  [ThreadFailureRemedy.TRY_AGAIN]: 'chat.threadProgress.recovery.remedy.tryAgain',
  [ThreadFailureRemedy.TRY_SUGGESTED_MODEL]: 'chat.threadProgress.recovery.remedy.trySuggested',
  [ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL]: 'chat.threadProgress.recovery.remedy.chooseModel',
  [ThreadFailureRemedy.USE_RECOMMENDED_TEAM]: 'chat.threadProgress.recovery.remedy.recommendedTeam',
  [ThreadFailureRemedy.SHORTER_ARTICLE]: 'chat.threadProgress.recovery.remedy.shorterArticle',
  [ThreadFailureRemedy.RAISE_SPEND_CAP]: 'chat.threadProgress.recovery.remedy.raiseCap',
  [ThreadFailureRemedy.ADD_CREDIT]: 'chat.threadProgress.recovery.remedy.addCredit',
  [ThreadFailureRemedy.CHANGE_TOPIC]: 'chat.threadProgress.recovery.remedy.changeTopic',
};

export const THREAD_HEALING_RESULT_KEYS: Readonly<Record<ThreadHealingResult, string>> = {
  [ThreadHealingResult.PENDING]: 'chat.threadProgress.recovery.result.pending',
  [ThreadHealingResult.SUCCEEDED]: 'chat.threadProgress.recovery.result.succeeded',
  [ThreadHealingResult.FAILED]: 'chat.threadProgress.recovery.result.failed',
};

/** Healing steps that moved the role to another model, as opposed to changing how the same model is asked. */
export const THREAD_MODEL_SWAP_STRATEGIES: ReadonlySet<ThreadHealingStrategy> = new Set([
  ThreadHealingStrategy.TEAM_FALLBACK,
  ThreadHealingStrategy.CROSS_PROVIDER,
  ThreadHealingStrategy.SAFE_DEFAULT,
]);

/** Step codes that are healing steps, so the timeline does not offer "show what the AI said" for them. */
export const THREAD_HEALING_STEP_CODES: ReadonlySet<string> = new Set(
  Object.values(ThreadHealingStrategy),
);

/** One-click remedies shown at most; the service orders them by how likely they are to help. */
export const THREAD_RECOVERY_MAX_REMEDIES = 3;

/** Remedies that need the owner to change something in the form, not one request. */
export const THREAD_FORM_REMEDIES: ReadonlySet<ThreadFailureRemedy> = new Set([
  ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL,
  ThreadFailureRemedy.RAISE_SPEND_CAP,
  ThreadFailureRemedy.CHANGE_TOPIC,
]);

/** The seats of the recommended team, matched to the job's roles by kind and position. */
export const THREAD_JUDGE_ROLE_KIND = 'JUDGE';
export const THREAD_CRITIC_ROLE_KIND = 'CRITIC';
export const THREAD_AUTHOR_ROLE_KIND = 'AUTHOR';
