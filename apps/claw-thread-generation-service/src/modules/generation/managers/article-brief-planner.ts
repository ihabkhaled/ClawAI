import type { ChatModelResponse } from '../../models/chat-model.client';
import {
  BRIEF_HEAL_ATTEMPTS,
  BRIEF_MAX_OUTPUT_TOKENS,
  BRIEF_REPLY_SHAPE,
  BRIEF_ROLE_ID,
  BRIEF_SPEND_CEILING_PERCENT,
  BRIEF_SYSTEM_PROMPT,
} from '../constants/article-brief.constants';
import { type ArticleBrief, articleBriefSchema } from '../types/article-brief.types';
import type { HealingBudget, RoleCallSpec } from '../types/healing.types';
import type { GenerationPipelineInput, ModelRole } from '../types/generation-pipeline.types';
import { buildBriefUserPrompt } from '../utilities/article-brief-prompt.utility';
import { GenerationAttemptTimeoutError } from '../utilities/generation-attempt-timeout.error';
import { parseModelJson } from '../utilities/parse-model-json.utility';
import { ThreadGenerationCancelledError } from '../utilities/thread-generation-cancelled.error';
import { ThreadGenerationLeaseLostError } from '../utilities/thread-generation-lease-lost.error';

const PERCENT = 100;

export type ArticleBriefPlannerDeps = {
  call: (
    input: GenerationPipelineInput,
    budget: HealingBudget,
    spec: RoleCallSpec,
  ) => Promise<ChatModelResponse>;
  /** The job's spend so far, or null when unknown. */
  spentMicroUsd: (jobId: string) => Promise<number | null>;
};

/**
 * The planning step before research (2026-11-22). The topic box may hold a subject, a question or
 * only instructions about the article ("very long, never concise"), in any language, so one cheap
 * model call reads the box together with the whole conversation and names the article subject and
 * the searches that find sources for it. Bounded like the FORMAT stage (one call plus one retry, no
 * model swap, counted in the job's spend, skipped at 85 percent of the cap) and it never fails the
 * job: any problem answers null and research falls back to the box plus the conversation. The healer
 * writes its step-log rows.
 */
export class ArticleBriefPlanner {
  constructor(private readonly deps: ArticleBriefPlannerDeps) {}

  async plan(input: GenerationPipelineInput): Promise<ArticleBrief | null> {
    if (await this.overBudget(input)) return null;
    try {
      const response = await this.deps.call(
        { ...input, healing: undefined },
        { jobAttemptsLeft: BRIEF_HEAL_ATTEMPTS, spendCapMicroUsd: null, spentMicroUsd: 0 },
        {
          role: pickBriefRole(input),
          roleKey: BRIEF_ROLE_ID,
          round: 1,
          prompt: {
            systemPrompt: BRIEF_SYSTEM_PROMPT,
            userPrompt: buildBriefUserPrompt(input.topic, input.sourceSnapshot),
          },
          accepts: articleBriefSchema,
          shapeHint: BRIEF_REPLY_SHAPE,
        },
      );
      const parsed = articleBriefSchema.safeParse(
        parseModelJson(response.content, articleBriefSchema),
      );
      if (!parsed.success) return null;
      return {
        subject: parsed.data.subject,
        researchQueries: parsed.data.researchQueries
          .map((query) => query.trim())
          .filter((query) => query.length > 0),
      };
    } catch (error: unknown) {
      if (isCancellation(error, input)) throw error;
      return null;
    }
  }

  private async overBudget(input: GenerationPipelineInput): Promise<boolean> {
    const cap = input.spendCapMicroUsd;
    if (!cap) return false;
    let spent = input.spentMicroUsd ?? 0;
    try {
      spent = (await this.deps.spentMicroUsd(input.jobId)) ?? spent;
    } catch {
      // Best effort: the figure the attempt began with still bounds it.
    }
    return spent * PERCENT >= cap * BRIEF_SPEND_CEILING_PERCENT;
  }
}

export function isCancellation(error: unknown, input: GenerationPipelineInput): boolean {
  return (
    input.signal?.aborted === true ||
    error instanceof ThreadGenerationCancelledError ||
    error instanceof ThreadGenerationLeaseLostError ||
    error instanceof GenerationAttemptTimeoutError
  );
}

/** The cheapest model the owner's plan allows (ADR-181 pool, by cost rank), else the Judge's. */
export function pickBriefRole(input: GenerationPipelineInput): ModelRole {
  const cheapest = [...(input.healing?.pool ?? [])]
    .filter((candidate) => candidate.costRank !== undefined)
    .sort((a, b) => (a.costRank ?? 0) - (b.costRank ?? 0))[0];
  const base = cheapest ?? input.healing?.safeDefault ?? input.judge;
  return {
    id: BRIEF_ROLE_ID,
    provider: base.provider,
    model: base.model,
    maxOutputTokens: BRIEF_MAX_OUTPUT_TOKENS,
    fallbacks: [],
  };
}
