import type {
  ThreadArticleLength,
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadFailureRemedy,
  ThreadHealingResult,
  ThreadHealingStrategy,
} from '../enums';

/** Owner-only, step-by-step record of one Thread generation job. Never public. */

export type ThreadGenerationStepOutcome =
  'STARTED' | 'SUCCEEDED' | 'FAILED' | 'RETRY' | 'FALLBACK' | 'SKIPPED';

export type ThreadGenerationStepRoleKind = 'AUTHOR' | 'JUDGE' | 'CRITIC' | 'RESEARCH' | 'SYSTEM';

export type ThreadGenerationStep = {
  seq: number;
  at: string;
  stage: string;
  round: number;
  outcome: ThreadGenerationStepOutcome;
  roleKind: ThreadGenerationStepRoleKind;
  /** Request role id (e.g. author-1); null for system and research steps. */
  roleId: string | null;
  provider: string | null;
  model: string | null;
  /** Stable machine code the UI translates, e.g. PAYG_CREDIT_EXHAUSTED. */
  code: string | null;
  /** Upstream HTTP status when the step failed on a provider call. */
  httpStatus: number | null;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** First part of what the model produced, owner-only, bounded, redacted. */
  excerpt: string | null;
};

export type ThreadGenerationSelectionRole = {
  roleId: string;
  roleKind: ThreadGenerationStepRoleKind;
  provider: string;
  model: string;
  fallbacks: Array<{ provider: string; model: string }>;
};

export type ThreadGenerationSelections = {
  topic: string;
  publicationType: string;
  contentLocale: string;
  sourceThreadId: string;
  spendCapMicroUsd: string;
  roles: ThreadGenerationSelectionRole[];
};

export type ThreadModelRef = { provider: string; model: string };

/** A model the pipeline may fall back to; `windowTokens` and `costRank` are hints from the catalog. */
export type ThreadHealingCandidate = ThreadModelRef & {
  windowTokens?: number;
  costRank?: number;
};

/** Extra models a job may heal with once a role's own backups are spent (ADR-181). */
export type ThreadHealingPool = {
  /** Plan-allowed, priced, window-fit models, cheapest first. */
  pool: ThreadHealingCandidate[];
  /** The last resort, always disclosed in the step log. */
  safeDefault?: ThreadHealingCandidate;
};

/** What the last failed review said, so the panel can tell a low score from an unmet requirement. */
export type ThreadReviewVerdict = {
  reviewer: 'JUDGE' | 'CRITIC';
  score: number;
  minScore: number;
  /** The reviewer's blocker texts, in the article's language, as given. */
  blockers: string[];
  /** True when the score met the minimum and the blockers alone failed the review. */
  blocked: boolean;
  /** The blockers that ask for evidence the pipeline could not supply; the owner may accept them (ADR-194). */
  evidenceGapBlockers?: string[];
  /**
   * The model that actually answered this review; `fallback` is true when it is not the model the
   * owner chose for the seat (the chosen one failed and the service healed onto another). Absent
   * from older services (ADR-195).
   */
  reviewerModel?: ThreadReviewerModel;
};

/** The model that answered a review, and whether it replaced the owner's pick. */
export type ThreadReviewerModel = {
  provider: string;
  model: string;
  fallback: boolean;
};

export type ThreadGenerationFailure = {
  code: string;
  failedStage: string;
  roleId: string | null;
  httpStatus: number | null;
  retryable: boolean;
  /** Absent from older services. */
  phase?: ThreadFailurePhase;
  failureClass?: ThreadFailureClass;
  /** Remedies in the order the panel shows them. */
  remedies?: ThreadFailureRemedy[];
  /** A model the panel can offer for the failed role, picked by the service. */
  suggestedModel?: ThreadModelRef | null;
  /** The last failed review; absent unless the job failed its review (ADR-193). */
  review?: ThreadReviewVerdict | null;
};

/** One healing attempt the service made, derived from the step log. */
export type ThreadHealingAttempt = {
  seq: number;
  phase: ThreadFailurePhase;
  roleId: string | null;
  strategy: ThreadHealingStrategy;
  /** Why the step before it failed. */
  failureClass: ThreadFailureClass;
  provider: string | null;
  model: string | null;
  result: ThreadHealingResult;
};

export type ThreadGenerationHealing = {
  attempts: ThreadHealingAttempt[];
  /** True while the newest attempt has no result yet: the panel says "Retrying...". */
  active: boolean;
};

/**
 * Where a QUEUED job stands, so the owner is not left guessing (ADR-183). `WAITING_FOR_WORKER`: it
 * can run now and waits for a free worker; `ahead` is how many runnable jobs were queued before it.
 * `BACKOFF`: an attempt failed and the next one is scheduled for `retryAt`.
 */
export type ThreadGenerationQueue = {
  state: 'WAITING_FOR_WORKER' | 'BACKOFF';
  ahead: number;
  retryAt: string | null;
};

export type ThreadGenerationProgress = {
  publicationId: string;
  jobId: string;
  status: string;
  stage: string;
  round: number;
  attemptCount: number;
  maxAttempts: number;
  spentMicroCredits: string;
  /**
   * True when the platform (not the owner) failed the job and the Free allowance, money and the
   * lifetime Thread, was given back. Absent from older services; read it as false.
   */
  allowanceRefunded?: boolean;
  createdAt: string;
  updatedAt: string;
  selections: ThreadGenerationSelections;
  failure: ThreadGenerationFailure | null;
  /** What the service already tried; absent from older services. */
  healing?: ThreadGenerationHealing;
  /** Set only while the job is QUEUED; absent from older services. */
  queue?: ThreadGenerationQueue | null;
  steps: ThreadGenerationStep[];
};

/** Owner changes to the selections when retrying a failed generation. */
export type ThreadGenerationRetryRequest = {
  idempotencyKey: string;
  topic?: string;
  spendCapUsd?: number;
  models?: Array<{ roleId: string; provider: string; model: string }>;
  /** `SHORT` asks the authors for a shorter article (the "Shorter article" remedy). */
  articleLength?: ThreadArticleLength;
  /** True runs a fresh research pass instead of reusing the failed job's saved research. */
  refreshResearch?: boolean;
  /**
   * Evidence-gap blocker texts the owner accepts (at most 8, each at most 300 characters), taken
   * from the failed review. The article then states each one in a limitations section (ADR-194).
   */
  acceptedEvidenceGaps?: string[];
  /**
   * The same choice as indexes into `failure.review.evidenceGapBlockers` (at most 8), so the client
   * need not echo the text. The server accepts only what the failed review stored as an
   * evidence-gap blocker; anything else is refused with `ACCEPTED_GAP_NOT_A_BLOCKER` (ADR-195).
   */
  acceptedEvidenceGapIndexes?: number[];
};
