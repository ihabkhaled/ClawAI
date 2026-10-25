import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import {
  CRITIC_STAGE,
  GENERATION_ATTEMPT_MAX_MS,
  JUDGE_STAGE,
  MAX_GENERATION_ROUNDS,
} from '../constants/generation.constants';
import {
  HEALTH_CACHE_TTL_MS,
  HEALTH_WINDOW_MS,
  RESEARCH_ATTEMPTS,
} from '../constants/healing.constants';
import { ThreadFailureClass, ThreadHealingStrategy } from '@claw/shared-types';
import { backoffDelayMs } from '../utilities/backoff-delay.utility';
import {
  AUTHOR_CANDIDATE_VOTE_REPLY_SHAPE,
  REVIEW_REPLY_SHAPE,
  VOTE_REPLY_SHAPE,
} from '../constants/healing-notes.constants';
import { AUTHOR_REPLY_SHAPE } from '../constants/author-prompt.constants';
import { ThreadGenerationStage } from '../../../generated/prisma';
import { ChatModelClient, type ChatModelResponse } from '../../models/chat-model.client';
import { ResearchClient, type ResearchEvidence } from '../../research/research.client';
import { resolveAuthorConsensus } from '../utilities/author-consensus.utility';
import { buildReviewSystemPrompt } from '../utilities/review-prompt.utility';
import { GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { abortReasonToError } from '../utilities/abort-reason-error.utility';
import { GenerationAttemptTimeoutError } from '../utilities/generation-attempt-timeout.error';
import { ThreadGenerationCancelledError } from '../utilities/thread-generation-cancelled.error';
import { ThreadGenerationLeaseLostError } from '../utilities/thread-generation-lease-lost.error';
import { stableJson } from '../utilities/stable-json.utility';
import { normalizeAuthorOutput } from '../utilities/normalize-author-output.utility';
import { parseModelJson } from '../utilities/parse-model-json.utility';
import { ReviewerRole } from '../types/reviewer-role.enum';
import { StepRecorder } from '../services/step-recorder.service';
import { GenerationSpendSyncService } from '../services/generation-spend-sync.service';
import {
  DeterministicGenerationError,
  isDeterministicGenerationError,
} from '../utilities/deterministic-generation.error';
import { parseStepError } from '../utilities/parse-step-error.utility';
import { buildAuthorSystemPrompt } from '../utilities/author-prompt.utility';
import { createHealingBudget } from '../utilities/healing-budget.utility';
import { waitBeforeRetry } from '../utilities/wait-before-retry.utility';
import { citationTable } from '../utilities/citation-table.utility';
import { RoleHealer } from './role-healer';
import { ArticleFormatter } from './article-formatter';
import type { CandidateHealth, RolePrompt } from '../types/healing.types';
import {
  NON_RETRYABLE_STEP_CODES,
  STEP_FALLBACK_ERROR_CODE,
  STEP_FALLBACK_SKIPPED_CODE,
  STEP_RESUMED_CODE,
} from '../constants/step-recorder.constants';
import { roleStepInfo } from '../utilities/role-step.utility';
import {
  type AuthorDraft,
  authorDraftSchema,
  checkpointBundleSchema,
  type GenerationPipelineInput,
  type GenerationPipelineResult,
  type GenerationRoundContext,
  type GenerationRoundOutcome,
  type ModelRole,
  modelRoleSchema,
  reviewSchemaForCandidateCount,
  type ReviewStageResult,
  type ReviewStageSpec,
  type StructuredReview,
} from '../types/generation-pipeline.types';
import {
  revisionAuthorResponseSchema,
  type RevisionAuthorVote,
  type RevisionCandidateVote,
  revisionCandidateVoteResponseSchema,
} from '../types/revision-review.types';
import { evaluateRevisionReview, revisionDraftHash } from '../utilities/revision-review.utility';
import type {
  AuthorCandidateReviewContext,
  AuthorConsensusResult,
} from '../types/author-consensus.types';

@Injectable()
export class GenerationPipelineManager {
  private readonly logger = new Logger(GenerationPipelineManager.name);
  private readonly healer: RoleHealer;
  private readonly formatter: ArticleFormatter;
  private healthCache:
    { value: ReadonlyMap<string, CandidateHealth>; expiresAt: number } | undefined;

  constructor(
    private readonly research: ResearchClient,
    private readonly models: ChatModelClient,
    private readonly jobs: GenerationJobsRepository,
    private readonly recorder: StepRecorder,
    private readonly spendSync: GenerationSpendSyncService,
  ) {
    this.healer = new RoleHealer({
      generate: (request) => this.models.generate(request),
      record: (jobId, step) => this.recorder.record(jobId, step),
      recordSpend: (jobId, budgetId, microUsd) => this.recordSpend(jobId, budgetId, microUsd),
      throwIfCancelled: (input) => this.throwIfCancelled(input),
      loadHealth: () => this.loadHealth(),
      loadDemoted: (jobId, roleId) => this.loadDemoted(jobId, roleId),
      wait: waitBeforeRetry,
      now: () => Date.now(),
      random: () => Math.random(),
    });
    this.formatter = new ArticleFormatter({
      call: (input, budget, spec) => this.healer.call(input, budget, spec),
      record: (jobId, step) => this.recorder.record(jobId, step),
      spentMicroUsd: (jobId) => this.jobs.readSpentMicroUsd(jobId),
    });
  }

  async generate(input: GenerationPipelineInput): Promise<GenerationPipelineResult> {
    const checked = { ...this.validateRoles(input), healingBudget: createHealingBudget(input) };
    await this.noteSkippedFallbacks(input, checked);
    return this.withAttemptCeiling(checked, (job) => this.runGenerate(job));
  }

  /**
   * One attempt gets a fixed time budget. Its signal joins the job's own, so every model call
   * in flight, parallel votes included, stops when the budget is spent or the job is cancelled.
   */
  private async withAttemptCeiling<T>(
    job: GenerationPipelineInput,
    run: (bounded: GenerationPipelineInput) => Promise<T>,
  ): Promise<T> {
    const ceiling = new AbortController();
    const timer = setTimeout(() => {
      ceiling.abort(new GenerationAttemptTimeoutError());
    }, GENERATION_ATTEMPT_MAX_MS);
    const signal = job.signal ? AbortSignal.any([job.signal, ceiling.signal]) : ceiling.signal;
    try {
      return await run({ ...job, signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async runGenerate(job: GenerationPipelineInput): Promise<GenerationPipelineResult> {
    const evidence = await this.resolveEvidence(job);
    const evidenceItems = this.evidenceItems(evidence.bundle);
    await this.throwIfCancelled(job);
    const context: GenerationRoundContext = {
      job,
      evidence,
      evidenceItems,
      sharedMaterial: JSON.stringify({
        version: 1,
        topic: job.topic,
        publicationType: job.publicationType,
        sourceSnapshot: job.sourceSnapshot,
        researchEvidence: evidence.bundle,
      }),
    };
    let revisionBrief = '';

    for (let round = 1; round <= MAX_GENERATION_ROUNDS; round += 1) {
      const outcome = await this.runRound(context, round, revisionBrief);
      if (outcome.kind === 'passed') return outcome.result;
      revisionBrief = outcome.revisionBrief;
    }
    throw new ServiceUnavailableException(
      'Generation did not pass consensus and reviews in three rounds',
    );
  }

  private async resolveEvidence(job: GenerationPipelineInput): Promise<ResearchEvidence> {
    const saved = await this.jobs.loadResumeState(job.jobId);
    const savedBundle = checkpointBundleSchema.safeParse(saved.evidenceBundle);
    if (
      saved.evidenceBundle !== null &&
      saved.evidenceBundle !== undefined &&
      !this.isCheckpointIntact(savedBundle, saved.evidenceBundleHash)
    ) {
      throw new ServiceUnavailableException(
        'Saved research checkpoint failed integrity validation',
      );
    }
    if (savedBundle.success && saved.evidenceBundleHash) {
      await this.recordResumed(job.jobId);
      return {
        researchRunId: '',
        bundle: savedBundle.data,
        sha256: saved.evidenceBundleHash,
        version: 1 as const,
      };
    }
    const evidence = await this.runResearch(job);
    if (!savedBundle.success) {
      const savedEvidence = await this.jobs.saveResearchEvidence(job.jobId, job.attempt, evidence);
      if (!savedEvidence) throw new ThreadGenerationLeaseLostError();
    }
    return evidence;
  }

  private isCheckpointIntact(
    parsed: z.ZodSafeParseResult<Record<string, unknown>>,
    savedHash: string | null | undefined,
  ): boolean {
    return (
      parsed.success &&
      Boolean(savedHash) &&
      (this.hash(JSON.stringify(parsed.data)) === savedHash ||
        this.hash(stableJson(parsed.data)) === savedHash)
    );
  }

  private async runRound(
    context: GenerationRoundContext,
    round: number,
    revisionBrief: string,
  ): Promise<GenerationRoundOutcome> {
    const { job, evidence } = context;
    const drafts = await this.runAuthorStage(context, round, revisionBrief);
    const consensus = await this.reachConsensus(context, round, drafts);
    if (consensus.status === 'invalid') {
      throw new DeterministicGenerationError('Author preference votes were invalid');
    }
    const preferredCandidate = drafts[consensus.preferredCandidateIndex];
    if (!preferredCandidate)
      throw new ServiceUnavailableException('The Judge has no candidate to review');
    const candidateContext: AuthorCandidateReviewContext = {
      candidates: drafts,
      agreementPercent: consensus.agreementPercent,
      preferredCandidateIndex: consensus.preferredCandidateIndex,
    };
    const judge = await this.runReviewStage(
      context,
      round,
      JUDGE_STAGE,
      job.judge,
      preferredCandidate,
      candidateContext,
    );
    if (judge.revisionBrief !== null) return { kind: 'retry', revisionBrief: judge.revisionBrief };
    const candidate = drafts[judge.review.selectedCandidateIndex];
    if (!candidate)
      throw new ServiceUnavailableException('The Judge selected an unknown candidate');
    const critic = await this.runReviewStage(context, round, CRITIC_STAGE, job.critic, candidate);
    if (critic.revisionBrief !== null) {
      return { kind: 'retry', revisionBrief: critic.revisionBrief };
    }
    // Typesetting runs on the reviewed text and never fails the job; the hash is the stored text's.
    const final = job.formatStage ? (await this.formatter.format(job, candidate)).draft : candidate;
    return {
      kind: 'passed',
      result: {
        markdown: final.markdown,
        citations: final.citations,
        draftHash: revisionDraftHash(final),
        evidenceBundle: evidence.bundle,
        evidenceHash: evidence.sha256,
        rounds: round,
        authorDrafts: drafts,
        judgeReview: judge.review,
        criticReview: critic.review,
        authorConsensus: consensus.status === 'consensus',
        authorAgreementPercent: consensus.agreementPercent,
        reviewReady: true,
        reviewReasons: [],
      },
    };
  }

  private async runAuthorStage(
    context: GenerationRoundContext,
    round: number,
    revisionBrief: string,
  ): Promise<AuthorDraft[]> {
    const { job, evidence, evidenceItems, sharedMaterial } = context;
    await this.enterStage(job, ThreadGenerationStage.AUTHOR_DRAFTS, round);
    const authorResults = await this.callAuthors(
      job,
      round,
      sharedMaterial,
      evidence.sha256,
      revisionBrief,
      evidenceItems,
    );
    const drafts = this.requireFulfilled(authorResults, 'An author role failed');
    await this.checkCitations(job, round, drafts, evidenceItems);
    return drafts;
  }

  private async reachConsensus(
    context: GenerationRoundContext,
    round: number,
    candidates: AuthorDraft[],
  ): Promise<AuthorConsensusResult> {
    const { job, evidence } = context;
    const voteMaterial = JSON.stringify({
      version: 1,
      topic: job.topic,
      publicationType: job.publicationType,
      sourceSnapshot: job.sourceSnapshot,
      researchEvidence: evidence.bundle,
      candidateDrafts: candidates,
    });
    await this.enterStage(job, ThreadGenerationStage.CONSENSUS, round);
    const voteResults = await Promise.allSettled(
      job.authors.map((role) =>
        this.callCandidateVote(job, role, candidates, voteMaterial, evidence.sha256, round),
      ),
    );
    const votes = this.requireFulfilled(voteResults, 'An author role failed to vote');
    const consensus = resolveAuthorConsensus(
      votes.map((vote) => ({
        role: vote.roleId,
        preferredCandidateIndex: vote.preferredCandidateIndex,
      })),
      candidates.length,
    );
    if (consensus.status === 'invalid') return consensus;
    await this.recorder.record(job.jobId, {
      stage: ThreadGenerationStage.CONSENSUS,
      round,
      outcome: 'SUCCEEDED',
      roleKind: 'SYSTEM',
      rawExcerpt: `Author preference agreement: ${String(consensus.agreementPercent)}%.`,
    });
    return consensus;
  }

  private async runReviewStage(
    context: GenerationRoundContext,
    round: number,
    spec: ReviewStageSpec,
    role: ModelRole,
    draft: AuthorDraft,
    candidateContext?: AuthorCandidateReviewContext,
  ): Promise<ReviewStageResult> {
    const { job, evidence, sharedMaterial } = context;
    await this.enterStage(job, spec.stage, round);
    const review = await this.callReview(
      job,
      role,
      spec.reviewer,
      round,
      sharedMaterial,
      draft,
      evidence.sha256,
      candidateContext,
    );
    if (review.score >= spec.minScore && review.blockers.length === 0) {
      return { review, revisionBrief: null };
    }
    const revisionBrief = this.reviewBrief(review);
    await this.recordReviewRetry(job, round, spec.reviewer, revisionBrief);
    return { review, revisionBrief };
  }

  async reviewRevision(
    input: GenerationPipelineInput,
    draft: AuthorDraft,
    evidenceBundle: Record<string, unknown>,
    evidenceHash: string,
  ): Promise<GenerationPipelineResult> {
    const checked = { ...this.validateRoles(input), healingBudget: createHealingBudget(input) };
    await this.noteSkippedFallbacks(input, checked);
    return this.withAttemptCeiling(checked, (job) =>
      this.runRevisionReview(job, draft, evidenceBundle, evidenceHash),
    );
  }

  private async runRevisionReview(
    job: GenerationPipelineInput,
    draft: AuthorDraft,
    evidenceBundle: Record<string, unknown>,
    evidenceHash: string,
  ): Promise<GenerationPipelineResult> {
    const evidenceItems = this.evidenceItems(evidenceBundle);
    await this.checkCitations(job, 1, [draft], evidenceItems);
    const draftHash = revisionDraftHash(draft);
    const sharedMaterial = JSON.stringify({
      version: 1,
      topic: job.topic,
      publicationType: job.publicationType,
      sourceSnapshot: job.sourceSnapshot,
      researchEvidence: evidenceBundle,
      exactCandidateHash: draftHash,
    });
    const authorVotes = await Promise.allSettled(
      job.authors.map((role) =>
        this.callRevisionVote(job, role, draft, draftHash, sharedMaterial, evidenceHash),
      ),
    );
    const votes = this.requireFulfilled(authorVotes, 'An author role failed to review the edit');
    await this.throwIfCancelled(job);
    const judge = await this.callReview(
      job,
      job.judge,
      ReviewerRole.JUDGE,
      1,
      sharedMaterial,
      draft,
      evidenceHash,
    );
    const critic = await this.callReview(
      job,
      job.critic,
      ReviewerRole.CRITIC,
      1,
      sharedMaterial,
      draft,
      evidenceHash,
    );
    const evaluation = evaluateRevisionReview({
      draft,
      expectedAuthorIds: job.authors.map(({ id }) => id),
      votes,
      judge,
      critic,
      evidence: evidenceItems,
    });
    return {
      markdown: draft.markdown,
      citations: draft.citations,
      draftHash: evaluation.draftHash,
      evidenceBundle,
      evidenceHash,
      rounds: 1,
      authorDrafts: [],
      judgeReview: judge,
      criticReview: critic,
      authorConsensus: evaluation.authorAgreementPercent > 50,
      authorAgreementPercent: evaluation.authorAgreementPercent,
      reviewReady: evaluation.ready,
      reviewReasons: evaluation.reasons,
    };
  }

  /** Tells the owner a saved checkpoint was reused instead of paying for the work again. */
  private async recordResumed(jobId: string, roleId?: string): Promise<void> {
    const info = roleId ? roleStepInfo(roleId) : undefined;
    await this.recorder.record(jobId, {
      stage: info?.stage ?? ThreadGenerationStage.RESEARCH,
      outcome: 'SKIPPED',
      roleKind: info?.roleKind ?? 'SYSTEM',
      roleId: roleId ?? null,
      code: STEP_RESUMED_CODE,
    });
  }

  private async runResearch(job: GenerationPipelineInput): Promise<ResearchEvidence> {
    const base = { stage: ThreadGenerationStage.RESEARCH, roleKind: 'RESEARCH' as const };
    for (let attempt = 1; ; attempt += 1) {
      const startedAt = Date.now();
      await this.recorder.record(job.jobId, { ...base, outcome: 'STARTED' });
      try {
        const evidence = await this.research.run(job.ownerId, job.topic, job.correlationId);
        await this.recorder.record(job.jobId, {
          ...base,
          outcome: 'SUCCEEDED',
          durationMs: Date.now() - startedAt,
        });
        return evidence;
      } catch (error: unknown) {
        const parsed = parseStepError(error, 'RESEARCH_FAILED');
        await this.recorder.record(job.jobId, {
          ...base,
          outcome: 'FAILED',
          code: parsed.code,
          httpStatus: parsed.httpStatus,
          durationMs: Date.now() - startedAt,
        });
        // Research is a service call, not a model: a short wait is the whole remedy (ADR-181).
        if (attempt >= RESEARCH_ATTEMPTS || job.signal?.aborted === true) throw error;
        await this.recorder.record(job.jobId, {
          ...base,
          outcome: 'RETRY',
          code: ThreadHealingStrategy.BACKOFF_RETRY,
          rawExcerpt: ThreadFailureClass.RESEARCH_FAILED,
        });
        await waitBeforeRetry(backoffDelayMs(attempt - 1, null) ?? 0, job.signal);
        await this.throwIfCancelled(job);
      }
    }
  }

  private async enterStage(
    job: GenerationPipelineInput,
    stage: ThreadGenerationStage,
    round: number,
  ): Promise<void> {
    await this.jobs.saveProgress(job.jobId, job.attempt, stage, round);
    await this.recorder.record(job.jobId, {
      stage,
      round,
      outcome: 'STARTED',
      roleKind: 'SYSTEM',
    });
  }

  private async checkCitations(
    job: GenerationPipelineInput,
    round: number,
    drafts: AuthorDraft[],
    evidence: Map<string, string>,
  ): Promise<void> {
    try {
      this.validateCitations(drafts, evidence);
    } catch (error: unknown) {
      await this.recorder.record(job.jobId, {
        stage: ThreadGenerationStage.AUTHOR_DRAFTS,
        round,
        outcome: 'FAILED',
        roleKind: 'SYSTEM',
        code: parseStepError(error).code,
      });
      throw error;
    }
  }

  private async recordReviewRetry(
    job: GenerationPipelineInput,
    round: number,
    reviewer: ReviewerRole,
    brief: string,
  ): Promise<void> {
    const isJudge = reviewer === ReviewerRole.JUDGE;
    const kind = isJudge ? 'JUDGE' : 'CRITIC';
    await this.recorder.record(job.jobId, {
      stage: kind,
      round,
      outcome: 'RETRY',
      roleKind: kind,
      roleId: isJudge ? job.judge.id : job.critic.id,
      code: `${kind}_SCORE_LOW`,
      rawExcerpt: brief,
    });
  }

  private callAuthors(
    job: GenerationPipelineInput,
    round: number,
    sharedMaterial: string,
    evidenceHash: string,
    revisionBrief: string,
    evidenceItems: Map<string, string>,
  ): Promise<PromiseSettledResult<AuthorDraft>[]> {
    return Promise.allSettled(
      job.authors.map((role) =>
        this.callAuthor(
          job,
          role,
          round,
          sharedMaterial,
          evidenceHash,
          revisionBrief,
          evidenceItems,
        ),
      ),
    );
  }

  private validateRoles(input: GenerationPipelineInput): GenerationPipelineInput {
    if (input.authors.length < 3 || input.authors.length > 5) {
      throw new DeterministicGenerationError('Generation requires three to five author roles');
    }
    const roles = [...input.authors, input.judge, input.critic].map((role) => {
      const parsed = modelRoleSchema.safeParse(role);
      if (!parsed.success) {
        throw new DeterministicGenerationError('A model role configuration is invalid');
      }
      // A fallback that is the primary itself cannot help; skip it (noted as a step), do not fail.
      // A different model of the same provider is a real fallback (ADR-181).
      return {
        ...parsed.data,
        fallbacks: parsed.data.fallbacks.filter(
          (fallback) =>
            fallback.provider !== parsed.data.provider || fallback.model !== parsed.data.model,
        ),
      };
    });
    const authors = roles.slice(0, input.authors.length);
    const judge = roles[input.authors.length];
    const critic = roles[input.authors.length + 1];
    if (!judge || !critic)
      throw new DeterministicGenerationError('Judge and Critic roles are required');
    const roleIds = roles.map((role) => role.id);
    if (new Set(roleIds).size !== roleIds.length) {
      throw new ServiceUnavailableException('Generation role identifiers must be unique');
    }
    return { ...input, authors, judge, critic };
  }

  /** One SKIPPED step per role whose same-provider fallback was dropped, so the owner sees why. */
  private async noteSkippedFallbacks(
    original: GenerationPipelineInput,
    checked: GenerationPipelineInput,
  ): Promise<void> {
    const before = new Map(
      [...original.authors, original.judge, original.critic].map((role) => [role.id, role]),
    );
    for (const role of [...checked.authors, checked.judge, checked.critic]) {
      if ((before.get(role.id)?.fallbacks.length ?? 0) === role.fallbacks.length) continue;
      const info = roleStepInfo(role.id);
      await this.recorder.record(original.jobId, {
        stage: info.stage,
        outcome: 'SKIPPED',
        roleKind: info.roleKind,
        roleId: role.id,
        provider: role.provider,
        model: role.model,
        code: STEP_FALLBACK_SKIPPED_CODE,
      });
    }
  }

  private async callAuthor(
    input: GenerationPipelineInput,
    role: ModelRole,
    round: number,
    sharedMaterial: string,
    evidenceHash: string,
    revisionBrief: string,
    evidenceItems: Map<string, string>,
  ): Promise<AuthorDraft> {
    const prompts: RolePrompt = {
      systemPrompt: buildAuthorSystemPrompt(input.contentLocale, input.articleLength),
      userPrompt: `${sharedMaterial}\nRevision brief: ${revisionBrief || 'Create a complete first draft.'}${citationTable(evidenceItems)}`,
      sharedMaterial,
    };
    const saved = await this.jobs.findCommunication(
      input.jobId,
      role.id,
      round,
      evidenceHash,
      this.hash(`${prompts.systemPrompt}\n${prompts.userPrompt}`),
    );
    if (saved !== null) {
      await this.recordResumed(input.jobId, role.id);
      const parsed = authorDraftSchema.safeParse(saved);
      if (!parsed.success) throw new ServiceUnavailableException('A saved author draft is invalid');
      return parsed.data;
    }
    // Accepted citation shapes are normalised first, then the evidence rule is enforced.
    const outputSchema = z.preprocess(
      (value) => normalizeAuthorOutput(value, evidenceItems),
      authorDraftSchema.refine((draft) =>
        draft.citations.every(({ evidenceId, url }) => evidenceItems.get(evidenceId) === url),
      ),
    );
    const response = await this.callRole(
      input,
      role,
      `author-${role.id}`,
      round,
      prompts,
      // A draft citing anything outside the evidence bundle is a wrong answer, so retry it.
      outputSchema,
      AUTHOR_REPLY_SHAPE,
    );
    const parsed = outputSchema.safeParse(this.parseJson(response.content, outputSchema));
    if (!parsed.success)
      throw new ServiceUnavailableException('An author returned an invalid draft');
    await this.persistCommunication(
      input,
      role,
      round,
      evidenceHash,
      prompts,
      response,
      parsed.data,
    );
    return parsed.data;
  }

  private async callReview(
    input: GenerationPipelineInput,
    role: ModelRole,
    reviewer: ReviewerRole,
    round: number,
    sharedMaterial: string,
    draft: AuthorDraft,
    evidenceHash: string,
    candidateContext?: AuthorCandidateReviewContext,
  ): Promise<StructuredReview> {
    const candidateCount = candidateContext?.candidates.length ?? 1;
    const accepts = reviewSchemaForCandidateCount(
      candidateCount,
      candidateContext?.preferredCandidateIndex ?? 0,
    );
    const prompts: RolePrompt = {
      systemPrompt: buildReviewSystemPrompt(reviewer, input.contentLocale, candidateCount),
      userPrompt: candidateContext
        ? `${sharedMaterial}\nAuthor preference agreement: ${String(candidateContext.agreementPercent)}%.\nCandidates in author order:\n${JSON.stringify(candidateContext.candidates)}`
        : `${sharedMaterial}\nDraft:\n${JSON.stringify(draft)}`,
      sharedMaterial,
    };
    const saved = await this.jobs.findCommunication(
      input.jobId,
      role.id,
      round,
      evidenceHash,
      this.hash(`${prompts.systemPrompt}\n${prompts.userPrompt}`),
    );
    if (saved !== null) {
      await this.recordResumed(input.jobId, role.id);
      const parsed = accepts.safeParse(saved);
      if (!parsed.success)
        throw new ServiceUnavailableException(`${reviewer} has a saved invalid review`);
      return parsed.data;
    }
    const response = await this.callRole(
      input,
      role,
      reviewer.toLowerCase(),
      round,
      prompts,
      accepts,
      REVIEW_REPLY_SHAPE,
    );
    const parsed = accepts.safeParse(this.parseJson(response.content, accepts));
    if (!parsed.success)
      throw new ServiceUnavailableException(`${reviewer} returned an invalid review`);
    await this.persistCommunication(
      input,
      role,
      round,
      evidenceHash,
      prompts,
      response,
      parsed.data,
    );
    return parsed.data;
  }

  private async callRevisionVote(
    input: GenerationPipelineInput,
    role: ModelRole,
    draft: AuthorDraft,
    draftHash: string,
    sharedMaterial: string,
    evidenceHash: string,
    { communicationPrefix, round }: { communicationPrefix: string; round: number } = {
      communicationPrefix: 'revision-author',
      round: 1,
    },
  ): Promise<RevisionAuthorVote> {
    const communicationRole = { ...role, id: `${communicationPrefix}-${role.id}` };
    const prompts: RolePrompt = {
      sharedMaterial,
      systemPrompt:
        'Review the exact candidate draft for factual support, coherence, and safety. Do not rewrite it. Return JSON {"agrees": boolean} only; do not repeat the hash. Do not include chain-of-thought.',
      userPrompt: `${sharedMaterial}\nExact candidate hash: ${draftHash}\nDraft:\n${JSON.stringify(draft)}`,
    };
    const saved = await this.jobs.findCommunication(
      input.jobId,
      communicationRole.id,
      round,
      evidenceHash,
      this.hash(`${prompts.systemPrompt}\n${prompts.userPrompt}`),
    );
    if (saved !== null) await this.recordResumed(input.jobId, communicationRole.id);
    const response =
      saved === null
        ? await this.callRole(
            input,
            role,
            communicationRole.id,
            round,
            prompts,
            revisionAuthorResponseSchema,
            VOTE_REPLY_SHAPE,
          )
        : null;
    const parsed = revisionAuthorResponseSchema.safeParse(
      saved ?? this.parseJson(response?.content ?? '', revisionAuthorResponseSchema),
    );
    if (!parsed.success) {
      throw new ServiceUnavailableException('An author returned an invalid edit review');
    }
    if (saved === null) {
      if (!response) throw new ServiceUnavailableException('An author response is missing');
      const persisted = await this.jobs.saveCommunication({
        jobId: input.jobId,
        attempt: input.attempt,
        role: communicationRole.id,
        round,
        inputHash: this.hash(`${prompts.systemPrompt}\n${prompts.userPrompt}`),
        evidenceHash,
        response,
        output: parsed.data,
      });
      if (!persisted) throw new ThreadGenerationLeaseLostError();
    }
    // The hash comes from the request, never from the model's echo.
    return { roleId: role.id, agrees: parsed.data.agrees, draftHash };
  }

  private async callCandidateVote(
    input: GenerationPipelineInput,
    role: ModelRole,
    candidates: AuthorDraft[],
    sharedMaterial: string,
    evidenceHash: string,
    round: number,
  ): Promise<RevisionCandidateVote> {
    const communicationRole = { ...role, id: `candidate-vote-${role.id}` };
    const prompts: RolePrompt = {
      sharedMaterial,
      systemPrompt:
        'Compare the candidate drafts for factual support, coherence, completeness, and safety. Choose the strongest candidate. Return only JSON {"preferredCandidateIndex": integer} using the zero-based author order. Do not rewrite the draft or include chain-of-thought.',
      userPrompt: `${sharedMaterial}\nCandidates in author order:\n${JSON.stringify(candidates)}`,
    };
    const inputHash = this.hash(`${prompts.systemPrompt}\n${prompts.userPrompt}`);
    const saved = await this.jobs.findCommunication(
      input.jobId,
      communicationRole.id,
      round,
      evidenceHash,
      inputHash,
    );
    if (saved !== null) await this.recordResumed(input.jobId, communicationRole.id);
    const accepts = revisionCandidateVoteResponseSchema.refine(
      (vote) => vote.preferredCandidateIndex < candidates.length,
    );
    const response =
      saved === null
        ? await this.callRole(
            input,
            role,
            `consensus-author-${role.id}`,
            round,
            prompts,
            accepts,
            AUTHOR_CANDIDATE_VOTE_REPLY_SHAPE,
          )
        : null;
    const parsed = accepts.safeParse(saved ?? this.parseJson(response?.content ?? '', accepts));
    if (!parsed.success) {
      throw new ServiceUnavailableException('An author returned an invalid candidate preference');
    }
    if (saved === null) {
      if (!response) throw new ServiceUnavailableException('An author response is missing');
      const persisted = await this.jobs.saveCommunication({
        jobId: input.jobId,
        attempt: input.attempt,
        role: communicationRole.id,
        round,
        inputHash,
        evidenceHash,
        response,
        output: parsed.data,
      });
      if (!persisted) throw new ThreadGenerationLeaseLostError();
    }
    return { roleId: role.id, preferredCandidateIndex: parsed.data.preferredCandidateIndex };
  }

  private async persistCommunication(
    input: GenerationPipelineInput,
    role: ModelRole,
    round: number,
    evidenceHash: string,
    prompts: RolePrompt,
    response: ChatModelResponse,
    output: Record<string, unknown>,
  ): Promise<void> {
    const saved = await this.jobs.saveCommunication({
      jobId: input.jobId,
      attempt: input.attempt,
      role: role.id,
      round,
      inputHash: this.hash(`${prompts.systemPrompt}\n${prompts.userPrompt}`),
      evidenceHash,
      response,
      output,
    });
    if (!saved) throw new ThreadGenerationLeaseLostError();
  }

  private callRole(
    input: GenerationPipelineInput,
    role: ModelRole,
    roleKey: string,
    round: number,
    prompt: RolePrompt,
    accepts: z.ZodType,
    shapeHint: string,
  ): Promise<ChatModelResponse> {
    const budget = input.healingBudget ?? createHealingBudget(input);
    return this.healer.call(input, budget, { role, roleKey, round, prompt, accepts, shapeHint });
  }

  /** Health of each model in the last hour, read best effort and cached for a minute. */
  private async loadHealth(): Promise<ReadonlyMap<string, CandidateHealth>> {
    const now = Date.now();
    if (this.healthCache && this.healthCache.expiresAt > now) return this.healthCache.value;
    let value: ReadonlyMap<string, CandidateHealth> = new Map();
    try {
      value = await this.recorder.recentModelHealth(new Date(now - HEALTH_WINDOW_MS));
    } catch {
      // Ranking is an optimisation: without it the pool keeps the catalog's order.
    }
    this.healthCache = { value, expiresAt: now + HEALTH_CACHE_TTL_MS };
    return value;
  }

  /** Models that failed this role for their own reasons in an earlier attempt of this job. */
  private async loadDemoted(jobId: string, roleId: string): Promise<ReadonlySet<string>> {
    try {
      return await this.recorder.modelSpecificFailures(jobId, roleId);
    } catch {
      return new Set();
    }
  }

  private evidenceItems(bundle: Record<string, unknown>): Map<string, string> {
    const items = bundle['items'];
    if (!Array.isArray(items))
      throw new ServiceUnavailableException('Research returned no evidence items');
    const evidence = new Map<string, string>();
    for (const item of items) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof item.id === 'string' &&
        'url' in item &&
        typeof item.url === 'string'
      ) {
        evidence.set(item.id, item.url);
      }
    }
    if (evidence.size === 0)
      throw new ServiceUnavailableException('Research returned no citable evidence');
    return evidence;
  }

  private validateCitations(drafts: AuthorDraft[], evidence: Map<string, string>): void {
    for (const draft of drafts) {
      if (draft.citations.some((citation) => evidence.get(citation.evidenceId) !== citation.url)) {
        throw new ServiceUnavailableException('A draft cited a URL outside its evidence bundle');
      }
    }
  }

  private requireFulfilled<T>(results: PromiseSettledResult<T>[], message: string): T[] {
    // An owner/billing refusal (cap too low, credit spent) wins over everything: another attempt is
    // refused the same way and re-runs the authors. Otherwise a transient failure wins, so a retry
    // is not skipped on a hunch.
    const rejections = results.filter((result) => result.status === 'rejected');
    const rejected =
      rejections.find((result) =>
        NON_RETRYABLE_STEP_CODES.has(parseStepError(result.reason, STEP_FALLBACK_ERROR_CODE).code),
      ) ??
      rejections.find((result) => !isDeterministicGenerationError(result.reason)) ??
      rejections[0];
    if (
      rejected?.status === 'rejected' &&
      (rejected.reason instanceof ThreadGenerationCancelledError ||
        rejected.reason instanceof GenerationAttemptTimeoutError)
    ) {
      throw rejected.reason;
    }
    if (rejected?.status === 'rejected') {
      throw new ServiceUnavailableException(message, { cause: rejected.reason });
    }
    return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  }

  private reviewBrief(review: {
    revisionBrief: string;
    blockers: string[];
    findings: string[];
  }): string {
    return JSON.stringify({
      revisionBrief: review.revisionBrief,
      blockers: review.blockers,
      findings: review.findings,
    });
  }

  private parseJson(content: string, accepts: z.ZodType): unknown {
    const parsed = parseModelJson(content, accepts);
    if (parsed === undefined) {
      throw new ServiceUnavailableException('A model returned invalid structured output');
    }
    return parsed;
  }

  /** Spend bookkeeping never fails a generation: the model call it describes already happened. */
  private async recordSpend(
    jobId: string,
    budgetId: string,
    microUsd: number | undefined,
  ): Promise<void> {
    if (microUsd) {
      try {
        await this.jobs.addSpend(jobId, microUsd);
      } catch {
        this.logger.warn('Generation spend could not be recorded');
      }
    }
    // After the call settled: the budget row now holds its real cost (throttled, best effort).
    await this.spendSync.sync(jobId, budgetId);
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async throwIfCancelled(input: GenerationPipelineInput): Promise<void> {
    if (input.signal?.aborted) throw abortReasonToError(input.signal.reason);
    if (await input.isCancellationRequested?.()) throw new ThreadGenerationCancelledError();
  }
}
