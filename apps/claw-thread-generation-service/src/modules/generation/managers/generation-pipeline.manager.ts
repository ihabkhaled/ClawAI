import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import {
  FORMAT_ATTEMPTS_PER_MODEL,
  MAX_GENERATION_ROUNDS,
  MIN_CRITIC_SCORE,
  MIN_JUDGE_SCORE,
} from '../constants/generation.constants';
import { ChatModelClient } from '../../models/chat-model.client';
import { ResearchClient } from '../../research/research.client';
import { resolveAuthorConsensus } from '../utilities/author-consensus.utility';
import { GenerationJobsRepository } from '../repositories/generation-jobs.repository';
import { ThreadGenerationCancelledError } from '../utilities/thread-generation-cancelled.error';
import { ThreadGenerationLeaseLostError } from '../utilities/thread-generation-lease-lost.error';
import { stableJson } from '../utilities/stable-json.utility';
import { stripCodeFence } from '../utilities/strip-code-fence.utility';
import { ReviewerRole } from '../types/reviewer-role.enum';
import {
  type AuthorDraft,
  authorDraftSchema,
  type GenerationPipelineInput,
  type GenerationPipelineResult,
  type ModelRole,
  modelRoleSchema,
  reviewSchema,
} from '../types/generation-pipeline.types';
import { revisionAuthorResponseSchema } from '../types/revision-review.types';
import { evaluateRevisionReview, revisionDraftHash } from '../utilities/revision-review.utility';

@Injectable()
export class GenerationPipelineManager {
  constructor(
    private readonly research: ResearchClient,
    private readonly models: ChatModelClient,
    private readonly jobs: GenerationJobsRepository,
  ) {}

  async generate(input: GenerationPipelineInput): Promise<GenerationPipelineResult> {
    const job = this.validateRoles(input);
    const saved = await this.jobs.loadResumeState(job.jobId);
    const savedBundle = z.record(z.string(), z.unknown()).safeParse(saved.evidenceBundle);
    if (
      saved.evidenceBundle !== null &&
      saved.evidenceBundle !== undefined &&
      (!savedBundle.success ||
        !saved.evidenceBundleHash ||
        (this.hash(JSON.stringify(savedBundle.data)) !== saved.evidenceBundleHash &&
          this.hash(stableJson(savedBundle.data)) !== saved.evidenceBundleHash))
    ) {
      throw new ServiceUnavailableException(
        'Saved research checkpoint failed integrity validation',
      );
    }
    const evidence =
      savedBundle.success && saved.evidenceBundleHash
        ? {
            researchRunId: '',
            bundle: savedBundle.data,
            sha256: saved.evidenceBundleHash,
            version: 1 as const,
          }
        : await this.research.run(job.ownerId, job.topic, job.correlationId);
    if (!savedBundle.success) {
      const savedEvidence = await this.jobs.saveResearchEvidence(job.jobId, job.attempt, evidence);
      if (!savedEvidence) throw new ThreadGenerationLeaseLostError();
    }
    const evidenceItems = this.evidenceItems(evidence.bundle);
    await this.throwIfCancelled(job);
    const sharedMaterial = JSON.stringify({
      version: 1,
      topic: job.topic,
      publicationType: job.publicationType,
      sourceSnapshot: job.sourceSnapshot,
      researchEvidence: evidence.bundle,
    });
    let revisionBrief = '';

    for (let round = 1; round <= MAX_GENERATION_ROUNDS; round += 1) {
      const authorResults = await this.callAuthors(
        job,
        round,
        sharedMaterial,
        evidence.sha256,
        revisionBrief,
        evidenceItems,
      );
      const drafts = this.requireFulfilled(authorResults, 'An author role failed');
      this.validateCitations(drafts, evidenceItems);
      // Independent models never write byte-identical drafts, so consensus is a vote:
      // one candidate, and every author must agree with its exact hash.
      const candidate = drafts[0];
      if (!candidate)
        throw new ServiceUnavailableException('Author consensus did not produce a draft');
      const candidateHash = revisionDraftHash(candidate);
      const voteMaterial = JSON.stringify({
        version: 1,
        topic: job.topic,
        publicationType: job.publicationType,
        sourceSnapshot: job.sourceSnapshot,
        researchEvidence: evidence.bundle,
        exactCandidateHash: candidateHash,
      });
      const voteResults = await Promise.allSettled(
        job.authors.map((role) =>
          this.callRevisionVote(
            job,
            role,
            candidate,
            candidateHash,
            voteMaterial,
            evidence.sha256,
            {
              communicationPrefix: 'consensus-author',
              round,
            },
          ),
        ),
      );
      const votes = this.requireFulfilled(voteResults, 'An author role failed to vote');
      const consensus = resolveAuthorConsensus(
        votes.map((vote) => ({
          role: vote.roleId,
          draftHash: vote.agrees ? vote.draftHash : `dissent:${vote.roleId}`,
        })),
      );
      if (consensus.status !== 'consensus' || consensus.draftHash !== candidateHash) {
        revisionBrief = `Authors did not all agree. Improve this candidate for factual support, coherence and evidence use, then return the complete improved draft: ${JSON.stringify(candidate)}`;
        continue;
      }

      const draft = candidate;
      const judge = await this.callReview(
        job,
        job.judge,
        ReviewerRole.JUDGE,
        round,
        sharedMaterial,
        draft,
        evidence.sha256,
      );
      if (judge.score < MIN_JUDGE_SCORE || judge.blockers.length > 0) {
        revisionBrief = this.reviewBrief(judge);
        continue;
      }

      const critic = await this.callReview(
        job,
        job.critic,
        ReviewerRole.CRITIC,
        round,
        sharedMaterial,
        draft,
        evidence.sha256,
      );
      if (critic.score < MIN_CRITIC_SCORE || critic.blockers.length > 0) {
        revisionBrief = this.reviewBrief(critic);
        continue;
      }
      return {
        markdown: draft.markdown,
        citations: draft.citations,
        draftHash: consensus.draftHash,
        evidenceBundle: evidence.bundle,
        evidenceHash: evidence.sha256,
        rounds: round,
        authorDrafts: drafts,
        judgeReview: judge,
        criticReview: critic,
        authorConsensus: true,
        reviewReady: true,
        reviewReasons: [],
      };
    }
    throw new ServiceUnavailableException(
      'Generation did not pass consensus and reviews in three rounds',
    );
  }

  async reviewRevision(
    input: GenerationPipelineInput,
    draft: AuthorDraft,
    evidenceBundle: Record<string, unknown>,
    evidenceHash: string,
  ): Promise<GenerationPipelineResult> {
    const job = this.validateRoles(input);
    const evidenceItems = this.evidenceItems(evidenceBundle);
    this.validateCitations([draft], evidenceItems);
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

  private callAuthors(
    job: GenerationPipelineInput,
    round: number,
    sharedMaterial: string,
    evidenceHash: string,
    revisionBrief: string,
    evidenceItems: Map<string, string>,
  ) {
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
      throw new ServiceUnavailableException('Generation requires three to five author roles');
    }
    const roles = [...input.authors, input.judge, input.critic].map((role) => {
      const parsed = modelRoleSchema.safeParse(role);
      if (!parsed.success) {
        throw new ServiceUnavailableException('A model role configuration is invalid');
      }
      if (parsed.data.fallbacks.some((fallback) => fallback.provider === parsed.data.provider)) {
        throw new ServiceUnavailableException('A fallback must use a different provider');
      }
      return parsed.data;
    });
    const authors = roles.slice(0, input.authors.length);
    const judge = roles[input.authors.length];
    const critic = roles[input.authors.length + 1];
    if (!judge || !critic)
      throw new ServiceUnavailableException('Judge and Critic roles are required');
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
  ) {
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
  ) {
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
    response: Awaited<ReturnType<ChatModelClient['generate']>>,
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
  ) {
    const candidates = [{ provider: role.provider, model: role.model }, ...role.fallbacks];
    const outputReserve = role.maxOutputTokens;
    let lastError: unknown;
    for (const [index, candidate] of candidates.entries()) {
      // A model that answers in the wrong shape gets one more try before its fallback.
      for (let attempt = 1; attempt <= FORMAT_ATTEMPTS_PER_MODEL; attempt += 1) {
        await this.throwIfCancelled(input);
        const requestId = `${input.jobId}:${roleKey}:round-${String(round)}:attempt-${String(index + 1)}${attempt > 1 ? `:try-${String(attempt)}` : ''}`;
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
          if (accepts.safeParse(this.tryParseJson(response.content)).success) return response;
          lastError = new ServiceUnavailableException('A model returned invalid structured output');
        } catch (error: unknown) {
          if (error instanceof ThreadGenerationCancelledError) throw error;
          lastError = error;
          break;
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new ServiceUnavailableException('No eligible model could complete this role');
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
    const rejected = results.find((result) => result.status === 'rejected');
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
