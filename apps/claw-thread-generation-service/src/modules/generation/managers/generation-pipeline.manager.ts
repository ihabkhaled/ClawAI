import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import {
  CRITIC_STAGE,
  FORMAT_ATTEMPTS_PER_MODEL,
  JUDGE_STAGE,
  MAX_GENERATION_ROUNDS,
} from '../constants/generation.constants';
import { ThreadGenerationStage } from '../../../generated/prisma';
import { ChatModelClient, type ChatModelResponse } from '../../models/chat-model.client';
import { ResearchClient, type ResearchEvidence } from '../../research/research.client';
import { resolveAuthorConsensus } from '../utilities/author-consensus.utility';
import { GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { ThreadGenerationCancelledError } from '../utilities/thread-generation-cancelled.error';
import { ThreadGenerationLeaseLostError } from '../utilities/thread-generation-lease-lost.error';
import { stableJson } from '../utilities/stable-json.utility';
import { stripCodeFence } from '../utilities/strip-code-fence.utility';
import { ReviewerRole } from '../types/reviewer-role.enum';
import { StepRecorder } from '../services/step-recorder.service';
import type { StepResponseOutcome } from '../types/step-recorder.types';
import {
  DeterministicGenerationError,
  isDeterministicGenerationError,
} from '../utilities/deterministic-generation.error';
import { parseStepError } from '../utilities/parse-step-error.utility';
import { STEP_RESUMED_CODE } from '../constants/step-recorder.constants';
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
  constructor(
    private readonly research: ResearchClient,
    private readonly models: ChatModelClient,
    private readonly jobs: GenerationJobsRepository,
    private readonly recorder: StepRecorder,
  ) {}

  async generate(input: GenerationPipelineInput): Promise<GenerationPipelineResult> {
    const job = this.validateRoles(input);
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
    const job = this.validateRoles(input);
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
      if (parsed.data.fallbacks.some((fallback) => fallback.provider === parsed.data.provider)) {
        throw new DeterministicGenerationError('A fallback must use a different provider');
      }
      return parsed.data;
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
      systemPrompt: `Write the requested publication in ${new Intl.DisplayNames(['en'], { type: 'language' }).of(input.contentLocale) ?? input.contentLocale} (${input.contentLocale}). Use only the supplied source and research evidence. Return only one JSON object shaped {"markdown": string, "citations": [{"evidenceId": string, "url": string}]} with no code fences and no other keys. Cite only evidence items from researchEvidence.items, using their id and url. Do not include analysis or hidden reasoning.`,
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
    const response = await this.callRole(
      input,
      role,
      `author-${role.id}`,
      round,
      prompts,
      // A draft citing anything outside the evidence bundle is a wrong answer, so retry it.
      authorDraftSchema.refine((draft) =>
        draft.citations.every(({ evidenceId, url }) => evidenceItems.get(evidenceId) === url),
      ),
    );
    const parsed = authorDraftSchema.safeParse(this.parseJson(response.content));
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
      systemPrompt: `Review the draft independently as ${reviewer}. Return only one JSON object shaped {"score": integer 0-100, "blockers": string[], "findings": string[] (at most five), "revisionBrief": string} with no code fences. Do not include chain-of-thought.`,
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
    const parsed = reviewSchema.safeParse(this.parseJson(response.content));
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
        'Review the exact candidate draft for factual support, coherence, and safety. Do not rewrite it. Return JSON with agrees (boolean) and draftHash copied exactly from the supplied candidate hash. Do not include chain-of-thought.',
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
      saved ?? this.parseJson(response?.content ?? ''),
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
    return { roleId: role.id, ...parsed.data };
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
    const outputReserve = role.maxOutputTokens;
    const { stage, roleKind } = roleStepInfo(roleKey);
    let lastError: unknown;
    let everyFailureDeterministic = true;
    for (const [index, candidate] of candidates.entries()) {
      const step = { stage, round, roleKind, roleId: role.id, ...candidate };
      if (index > 0) {
        await this.recorder.record(input.jobId, {
          ...step,
          outcome: 'FALLBACK',
          code: 'FALLBACK_USED',
        });
      }
      // A model that answers in the wrong shape gets one more try before its fallback.
      for (let attempt = 1; attempt <= FORMAT_ATTEMPTS_PER_MODEL; attempt += 1) {
        await this.throwIfCancelled(input);
        const requestId = `${input.jobId}:${roleKey}:round-${String(round)}:attempt-${String(index + 1)}${attempt > 1 ? `:try-${String(attempt)}` : ''}`;
        await this.recorder.record(input.jobId, { ...step, outcome: 'STARTED' });
        const startedAt = Date.now();
        try {
          const response = await this.models.generate({
            ownerId: input.ownerId,
            requestId,
            budgetId: input.budgetId,
            provider: candidate.provider,
            model: candidate.model,
            systemPrompt: prompt.systemPrompt,
            userPrompt: prompt.userPrompt,
            maxOutputTokens: outputReserve,
          });
          await this.throwIfCancelled(input);
          const accepted = accepts.safeParse(this.tryParseJson(response.content)).success;
          await this.recorder.record(input.jobId, {
            ...step,
            ...this.responseOutcome(accepted, attempt),
            durationMs: response.durationMs,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            rawExcerpt: response.content,
          });
          if (accepted) return response;
          everyFailureDeterministic = false;
          lastError = new ServiceUnavailableException('A model returned invalid structured output');
        } catch (error: unknown) {
          if (error instanceof ThreadGenerationCancelledError) throw error;
          const parsed = parseStepError(error);
          await this.recorder.record(input.jobId, {
            ...step,
            outcome: 'FAILED',
            code: parsed.code,
            httpStatus: parsed.httpStatus,
            durationMs: Date.now() - startedAt,
          });
          everyFailureDeterministic &&= isDeterministicGenerationError(error);
          lastError = error;
          break;
        }
      }
    }
    if (!(lastError instanceof Error)) {
      throw new ServiceUnavailableException('No eligible model could complete this role');
    }
    // One candidate failing for a reason a retry cannot fix does not make the role
    // permanent while another candidate failed transiently: only "all" ends the job.
    if (!everyFailureDeterministic && isDeterministicGenerationError(lastError)) {
      throw new ServiceUnavailableException(lastError.message);
    }
    throw lastError;
  }

  private responseOutcome(accepted: boolean, attempt: number): StepResponseOutcome {
    if (accepted) return { outcome: 'SUCCEEDED', code: null };
    return {
      outcome: attempt < FORMAT_ATTEMPTS_PER_MODEL ? 'RETRY' : 'FAILED',
      code: 'OUTPUT_INVALID',
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
    // A transient failure among the rejections wins, so a retry is not skipped on a hunch.
    const rejections = results.filter((result) => result.status === 'rejected');
    const rejected =
      rejections.find((result) => !isDeterministicGenerationError(result.reason)) ?? rejections[0];
    if (
      rejected?.status === 'rejected' &&
      rejected.reason instanceof ThreadGenerationCancelledError
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

  private tryParseJson(content: string): unknown {
    try {
      return JSON.parse(stripCodeFence(content));
    } catch {
      return undefined;
    }
  }

  private parseJson(content: string): unknown {
    const parsed = this.tryParseJson(content);
    if (parsed === undefined) {
      throw new ServiceUnavailableException('A model returned invalid structured output');
    }
    return parsed;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async throwIfCancelled(input: GenerationPipelineInput): Promise<void> {
    if (await input.isCancellationRequested?.()) throw new ThreadGenerationCancelledError();
  }
}
