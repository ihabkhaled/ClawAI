import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import {
  CRITIC_STAGE,
  FORMAT_ATTEMPTS_PER_MODEL,
  GENERATION_ATTEMPT_MAX_MS,
  JUDGE_STAGE,
  MAX_GENERATION_ROUNDS,
  OUTPUT_INVALID_CODE,
  REPAIR_NOTE_LEAD,
  REPAIR_NOTE_MAX_CHARS,
} from '../constants/generation.constants';
import { ThreadGenerationStage } from '../../../generated/prisma';
import { ChatModelClient, type ChatModelResponse } from '../../models/chat-model.client';
import { ChatModelIncompleteError } from '../../models/chat-model-incomplete.error';
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
import type { StepRecordInput, StepResponseOutcome } from '../types/step-recorder.types';
import {
  DeterministicGenerationError,
  isDeterministicGenerationError,
} from '../utilities/deterministic-generation.error';
import { parseStepError } from '../utilities/parse-step-error.utility';
import { CandidatesExhaustedError } from '../utilities/candidates-exhausted.error';
import {
  classifyModelOutput,
  describeOutputFailure,
} from '../utilities/describe-output-failure.utility';
import { buildAuthorSystemPrompt } from '../utilities/author-prompt.utility';
import { escalatedOutputTokens } from '../utilities/escalate-output-tokens.utility';
import { ModelOutputFailureKind } from '../../../common/enums/model-output-failure-kind.enum';
import { ROLE_MAX_MS, TRUNCATION_NOTE } from '../constants/output-retry.constants';
import type { CandidateAttempt, CandidateOutcome } from '../types/candidate-outcome.types';
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
  reviewSchema,
  type ReviewStageResult,
  type ReviewStageSpec,
  type StructuredReview,
} from '../types/generation-pipeline.types';
import {
  revisionAuthorResponseSchema,
  type RevisionAuthorVote,
} from '../types/revision-review.types';
import { evaluateRevisionReview, revisionDraftHash } from '../utilities/revision-review.utility';

@Injectable()
export class GenerationPipelineManager {
  private readonly logger = new Logger(GenerationPipelineManager.name);

  constructor(
    private readonly research: ResearchClient,
    private readonly models: ChatModelClient,
    private readonly jobs: GenerationJobsRepository,
    private readonly recorder: StepRecorder,
    private readonly spendSync: GenerationSpendSyncService,
  ) {}

  async generate(input: GenerationPipelineInput): Promise<GenerationPipelineResult> {
    const checked = this.validateRoles(input);
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
    // Independent models never write byte-identical drafts, so consensus is a vote:
    // one candidate, and every author must agree with its exact hash.
    const candidate = drafts[0];
    if (!candidate)
      throw new ServiceUnavailableException('Author consensus did not produce a draft');
    const candidateHash = revisionDraftHash(candidate);
    if (!(await this.reachConsensus(context, round, candidate, candidateHash))) {
      return {
        kind: 'retry',
        revisionBrief: `Authors did not all agree. Improve this candidate for factual support, coherence and evidence use, then return the complete improved draft: ${JSON.stringify(candidate)}`,
      };
    }
    const judge = await this.runReviewStage(context, round, JUDGE_STAGE, job.judge, candidate);
    if (judge.revisionBrief !== null) return { kind: 'retry', revisionBrief: judge.revisionBrief };
    const critic = await this.runReviewStage(context, round, CRITIC_STAGE, job.critic, candidate);
    if (critic.revisionBrief !== null) {
      return { kind: 'retry', revisionBrief: critic.revisionBrief };
    }
    return {
      kind: 'passed',
      result: {
        markdown: candidate.markdown,
        citations: candidate.citations,
        draftHash: candidateHash,
        evidenceBundle: evidence.bundle,
        evidenceHash: evidence.sha256,
        rounds: round,
        authorDrafts: drafts,
        judgeReview: judge.review,
        criticReview: critic.review,
        authorConsensus: true,
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
    candidate: AuthorDraft,
    candidateHash: string,
  ): Promise<boolean> {
    const { job, evidence } = context;
    const voteMaterial = JSON.stringify({
      version: 1,
      topic: job.topic,
      publicationType: job.publicationType,
      sourceSnapshot: job.sourceSnapshot,
      researchEvidence: evidence.bundle,
      exactCandidateHash: candidateHash,
    });
    await this.enterStage(job, ThreadGenerationStage.CONSENSUS, round);
    const voteResults = await Promise.allSettled(
      job.authors.map((role) =>
        this.callRevisionVote(job, role, candidate, candidateHash, voteMaterial, evidence.sha256, {
          communicationPrefix: 'consensus-author',
          round,
        }),
      ),
    );
    const votes = this.requireFulfilled(voteResults, 'An author role failed to vote');
    const consensus = resolveAuthorConsensus(
      votes.map((vote) => ({
        role: vote.roleId,
        draftHash: vote.agrees ? vote.draftHash : `dissent:${vote.roleId}`,
      })),
    );
    if (consensus.status === 'consensus' && consensus.draftHash === candidateHash) return true;
    await this.recorder.record(job.jobId, {
      stage: ThreadGenerationStage.CONSENSUS,
      round,
      outcome: 'RETRY',
      roleKind: 'SYSTEM',
      code: 'CONSENSUS_NOT_REACHED',
    });
    return false;
  }

  private async runReviewStage(
    context: GenerationRoundContext,
    round: number,
    spec: ReviewStageSpec,
    role: ModelRole,
    draft: AuthorDraft,
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
    const checked = this.validateRoles(input);
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
      authorConsensus: !evaluation.reasons.includes('AUTHOR_CONSENSUS_FAILED'),
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
    const startedAt = Date.now();
    const base = { stage: ThreadGenerationStage.RESEARCH, roleKind: 'RESEARCH' as const };
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
      throw error;
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
      // A fallback on the primary's provider cannot help; skip it (noted as a step), do not fail.
      return {
        ...parsed.data,
        fallbacks: parsed.data.fallbacks.filter(
          (fallback) => fallback.provider !== parsed.data.provider,
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
    const prompts = {
      systemPrompt: buildAuthorSystemPrompt(input.contentLocale),
      userPrompt: `${sharedMaterial}\nRevision brief: ${revisionBrief || 'Create a complete first draft.'}`,
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
  ): Promise<StructuredReview> {
    const prompts = {
      systemPrompt: buildReviewSystemPrompt(reviewer, input.contentLocale),
      userPrompt: `${sharedMaterial}\nDraft:\n${JSON.stringify(draft)}`,
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
      const parsed = reviewSchema.safeParse(saved);
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
      reviewSchema,
    );
    const parsed = reviewSchema.safeParse(this.parseJson(response.content, reviewSchema));
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
    const prompts = {
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

  private async persistCommunication(
    input: GenerationPipelineInput,
    role: ModelRole,
    round: number,
    evidenceHash: string,
    prompts: { systemPrompt: string; userPrompt: string },
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

  private async callRole(
    input: GenerationPipelineInput,
    role: ModelRole,
    roleKey: string,
    round: number,
    prompt: { systemPrompt: string; userPrompt: string },
    accepts: z.ZodType,
  ): Promise<ChatModelResponse> {
    const candidates = [{ provider: role.provider, model: role.model }, ...role.fallbacks];
    const deadline = Date.now() + ROLE_MAX_MS;
    const { stage, roleKind } = roleStepInfo(roleKey);
    const outcomes: CandidateOutcome[] = [];
    let lastError: unknown;
    let everyFailureDeterministic = true;
    for (const [index, candidate] of candidates.entries()) {
      // The role's time is spent: report what failed so far instead of starting another model.
      if (index > 0 && Date.now() > deadline) break;
      const step = { stage, round, roleKind, roleId: role.id, ...candidate };
      if (index > 0) {
        await this.recorder.record(input.jobId, {
          ...step,
          outcome: 'FALLBACK',
          code: 'FALLBACK_USED',
        });
      }
      const result = await this.tryCandidate(
        input,
        step,
        { roleKey, round, index, candidate, prompt, accepts, deadline },
        role,
      );
      if ('response' in result) return result.response;
      outcomes.push(result.failure);
      everyFailureDeterministic &&= result.deterministic;
      lastError = result.error;
    }
    throw this.exhaustedError(outcomes, lastError, everyFailureDeterministic);
  }

  /**
   * One candidate model: a wrong-shaped answer gets one more try, any other failure moves on to
   * the next candidate. Returns the accepted reply, or how the candidate finally failed.
   */
  private async tryCandidate(
    input: GenerationPipelineInput,
    step: Omit<StepRecordInput, 'outcome'>,
    call: {
      roleKey: string;
      round: number;
      index: number;
      candidate: { provider: string; model: string };
      prompt: { systemPrompt: string; userPrompt: string };
      accepts: z.ZodType;
      deadline: number;
    },
    role: ModelRole,
  ): Promise<CandidateAttempt<ChatModelResponse>> {
    const { candidate } = call;
    let failure: CandidateOutcome = {
      ...candidate,
      code: STEP_FALLBACK_ERROR_CODE,
      httpStatus: null,
    };
    let error: unknown;
    let deterministic = true;
    let repairNote = '';
    let maxOutputTokens = role.maxOutputTokens;
    for (let attempt = 1; attempt <= FORMAT_ATTEMPTS_PER_MODEL; attempt += 1) {
      if (attempt > 1 && Date.now() > call.deadline) break;
      await this.throwIfCancelled(input);
      const requestId = `${input.jobId}:${call.roleKey}:round-${String(call.round)}:attempt-${String(input.attempt)}:cand-${String(call.index + 1)}${attempt > 1 ? `:try-${String(attempt)}` : ''}`;
      await this.recorder.record(input.jobId, { ...step, outcome: 'STARTED' });
      const startedAt = Date.now();
      try {
        const response = await this.models.generate({
          ownerId: input.ownerId,
          requestId,
          budgetId: input.budgetId,
          provider: candidate.provider,
          model: candidate.model,
          systemPrompt: call.prompt.systemPrompt,
          userPrompt: `${call.prompt.userPrompt}${repairNote}`,
          maxOutputTokens,
          signal: input.signal,
        });
        // Paid for even if the job is cancelled or the answer is unusable, so counted first.
        await this.recordSpend(input.jobId, input.budgetId, response.costMicroUsd);
        await this.throwIfCancelled(input);
        const accepted = call.accepts.safeParse(
          parseModelJson(response.content, call.accepts),
        ).success;
        await this.recorder.record(input.jobId, {
          ...step,
          ...this.responseOutcome(accepted, attempt),
          durationMs: response.durationMs,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          rawExcerpt: accepted
            ? response.content
            : describeOutputFailure(response.content, call.accepts),
        });
        if (accepted) return { response };
        const reason = describeOutputFailure(response.content, call.accepts).slice(
          0,
          REPAIR_NOTE_MAX_CHARS,
        );
        const cutOff =
          classifyModelOutput(response.content, call.accepts) === ModelOutputFailureKind.TRUNCATED;
        // Cut off by the output limit: asking the same again fails the same way, so give it room.
        if (cutOff) maxOutputTokens = escalatedOutputTokens(maxOutputTokens, input.contentLocale);
        repairNote = `${cutOff ? TRUNCATION_NOTE : ''}${REPAIR_NOTE_LEAD}${reason}`;
        deterministic = false;
        failure = { ...candidate, code: OUTPUT_INVALID_CODE, httpStatus: null };
        error = new ServiceUnavailableException('A model returned invalid structured output');
      } catch (caught: unknown) {
        await this.recordCallFailure(input.jobId, input.budgetId, step, caught, startedAt);
        const parsed = parseStepError(caught);
        failure = { ...candidate, code: parsed.code, httpStatus: parsed.httpStatus };
        deterministic &&= isDeterministicGenerationError(caught);
        error = caught;
        break;
      }
    }
    return { failure, error, deterministic };
  }

  /**
   * Every candidate failed: one error that names the primary cause and each candidate's outcome.
   * One candidate failing for a reason a retry cannot fix does not make the role permanent while
   * another failed transiently, so only "all deterministic" keeps the deterministic marker.
   */
  private exhaustedError(
    outcomes: readonly CandidateOutcome[],
    lastError: unknown,
    everyFailureDeterministic: boolean,
  ): Error {
    if (!(lastError instanceof Error)) {
      return new ServiceUnavailableException('No eligible model could complete this role');
    }
    const cause =
      !everyFailureDeterministic && isDeterministicGenerationError(lastError)
        ? new ServiceUnavailableException(lastError.message)
        : lastError;
    return new CandidatesExhaustedError(outcomes, cause);
  }

  /**
   * Counts the spend and records the failed step. A cancel is not a step failure and ends the
   * role at once; so does a spent attempt time budget, because no other candidate can run
   * either. Both are rethrown, any other error is left for the caller to try a fallback.
   */
  private async recordCallFailure(
    jobId: string,
    budgetId: string,
    step: Omit<StepRecordInput, 'outcome'>,
    error: unknown,
    startedAt: number,
  ): Promise<void> {
    if (error instanceof ChatModelIncompleteError) {
      await this.recordSpend(jobId, budgetId, error.costMicroUsd);
    }
    if (error instanceof ThreadGenerationCancelledError) throw error;
    const parsed = parseStepError(error);
    await this.recorder.record(jobId, {
      ...step,
      outcome: 'FAILED',
      code: parsed.code,
      httpStatus: parsed.httpStatus,
      durationMs: Date.now() - startedAt,
    });
    if (error instanceof GenerationAttemptTimeoutError) throw error;
  }

  private responseOutcome(accepted: boolean, attempt: number): StepResponseOutcome {
    if (accepted) return { outcome: 'SUCCEEDED', code: null };
    return {
      outcome: attempt < FORMAT_ATTEMPTS_PER_MODEL ? 'RETRY' : 'FAILED',
      code: OUTPUT_INVALID_CODE,
    };
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
