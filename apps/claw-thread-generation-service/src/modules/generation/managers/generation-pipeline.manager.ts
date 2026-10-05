import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import {
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
      );
      const drafts = this.requireFulfilled(authorResults, 'An author role failed');
      this.validateCitations(drafts, evidenceItems);
      const consensus = resolveAuthorConsensus(
        drafts.map((draft, index) => ({
          role: job.authors[index]?.id ?? `author-${String(index + 1)}`,
          draftHash: this.hash(
            JSON.stringify({
              markdown: draft.markdown,
              citations: draft.citations.map(({ evidenceId, url }) => ({ evidenceId, url })),
            }),
          ),
        })),
      );
      if (consensus.status !== 'consensus') {
        revisionBrief =
          'Resolve author differences and return one consistent, evidence-backed draft.';
        continue;
      }

      const draft = drafts[0];
      if (!draft) throw new ServiceUnavailableException('Author consensus did not produce a draft');
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
  ) {
    return Promise.allSettled(
      job.authors.map((role) =>
        this.callAuthor(job, role, round, sharedMaterial, evidenceHash, revisionBrief),
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
  ): Promise<AuthorDraft> {
    const prompts = {
      systemPrompt:
        'Write the requested publication. Use only the supplied source and research evidence. Return JSON with markdown and citations [{evidenceId,url}]. Do not include analysis or hidden reasoning.',
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
    const response = await this.callRole(input, role, `author-${role.id}`, round, {
      ...prompts,
    });
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
      systemPrompt: `Review the draft independently as ${reviewer}. Return JSON with score 0-100, blockers, up to five findings, and a short revisionBrief. Do not include chain-of-thought.`,
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
    const response = await this.callRole(input, role, reviewer.toLowerCase(), round, {
      ...prompts,
    });
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
  ) {
    const communicationRole = { ...role, id: `revision-author-${role.id}` };
    const prompts = {
      systemPrompt:
        'Review the exact owner-edited draft for factual support, coherence, and safety. Do not rewrite it. Return JSON with agrees (boolean) and draftHash copied exactly from the supplied candidate hash. Do not include chain-of-thought.',
      userPrompt: `${sharedMaterial}\nExact candidate hash: ${draftHash}\nDraft:\n${JSON.stringify(draft)}`,
    };
    const saved = await this.jobs.findCommunication(
      input.jobId,
      communicationRole.id,
      1,
      evidenceHash,
      this.hash(`${prompts.systemPrompt}\n${prompts.userPrompt}`),
    );
    const response =
      saved === null ? await this.callRole(input, role, communicationRole.id, 1, prompts) : null;
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
        round: 1,
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
  ) {
    const candidates = [{ provider: role.provider, model: role.model }, ...role.fallbacks];
    const outputReserve = role.maxOutputTokens;
    let lastError: unknown;
    for (const [index, candidate] of candidates.entries()) {
      await this.throwIfCancelled(input);
      const requestId = `${input.jobId}:${roleKey}:round-${String(round)}:attempt-${String(index + 1)}`;
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
        return response;
      } catch (error: unknown) {
        if (error instanceof ThreadGenerationCancelledError) throw error;
        lastError = error;
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
    if (rejected?.status === 'rejected') throw new ServiceUnavailableException(message);
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

  private parseJson(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      throw new ServiceUnavailableException('A model returned invalid structured output');
    }
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async throwIfCancelled(input: GenerationPipelineInput): Promise<void> {
    if (await input.isCancellationRequested?.()) throw new ThreadGenerationCancelledError();
  }
}
