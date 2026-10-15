import { estimateTextTokens } from '@claw/shared-utilities';
import { z } from 'zod';

import {
  FORMAT_HEAL_ATTEMPTS,
  FORMAT_MAX_OUTPUT_TOKENS,
  FORMAT_MIN_OUTPUT_TOKENS,
  FORMAT_OUTPUT_FACTOR,
  FORMAT_REPLY_SHAPE,
  FORMAT_ROLE_ID,
  FORMAT_SKIPPED_ALREADY_PRETTY,
  FORMAT_SKIPPED_BUDGET,
  FORMAT_SKIPPED_MODEL_ERROR,
  FORMAT_SKIPPED_REPLY_INVALID,
  FORMAT_SPEND_CEILING_PERCENT,
} from '../constants/format-prompt.constants';
import type { ChatModelResponse } from '../../models/chat-model.client';
import type { HealingBudget, RoleCallSpec } from '../types/healing.types';
import type {
  AuthorDraft,
  GenerationPipelineInput,
  ModelRole,
} from '../types/generation-pipeline.types';
import type { StepRecordInput } from '../types/step-recorder.types';
import { escapeFormatReply } from '../utilities/format-reply.utility';
import type { FormatViolation } from '../types/format-guard.types';
import { validateFormatted } from '../utilities/format-guard.utility';
import { buildFormatSystemPrompt, buildFormatUserPrompt } from '../utilities/format-prompt.utility';
import { isFormattedArticle } from '../utilities/is-formatted-article.utility';
import { parseModelJson } from '../utilities/parse-model-json.utility';
import { sanitizeDraftMarkup } from '../utilities/sanitize-draft-markup.utility';
import { ThreadGenerationCancelledError } from '../utilities/thread-generation-cancelled.error';
import { ThreadGenerationLeaseLostError } from '../utilities/thread-generation-lease-lost.error';
import { GenerationAttemptTimeoutError } from '../utilities/generation-attempt-timeout.error';

const PERCENT = 100;
const formatReplySchema = z.object({ markdown: z.string().min(1).max(100_000) });

export type FormatOutcome = {
  draft: AuthorDraft;
  /** FORMATTED: the draft is the typeset text. SKIPPED: the draft is the one that came in. */
  status: 'FORMATTED' | 'SKIPPED';
  /** The SKIPPED reason (a `FORMAT_*` code); null when formatted. */
  code: string | null;
  /** Micro-USD this pass reported (already added to the job's spend by the caller's deps). */
  costMicroUsd: number;
};

export type ArticleFormatterDeps = {
  call: (
    input: GenerationPipelineInput,
    budget: HealingBudget,
    spec: RoleCallSpec,
  ) => Promise<ChatModelResponse>;
  /** Writes a step-log row; absent for a preview, which has no job. */
  record?: (jobId: string, step: StepRecordInput) => Promise<void>;
  /** The job's spend so far, or null when unknown (a preview). */
  spentMicroUsd?: (jobId: string) => Promise<number | null>;
};

/**
 * The optional FORMAT stage (ADR-189): one cheap model call that retypesets a reviewed article as
 * clean Markdown, then a deterministic guard that proves nothing but layout changed. Bounded
 * (one call plus one retry, no model swap), counted in the job's spend, skipped once 85 percent of
 * the cap is gone, and never failing the job: any problem keeps the article as it was and is logged
 * as a SKIPPED step with a code.
 */
export class ArticleFormatter {
  constructor(private readonly deps: ArticleFormatterDeps) {}

  async format(input: GenerationPipelineInput, draft: AuthorDraft): Promise<FormatOutcome> {
    if (isFormattedArticle(draft.markdown)) {
      return this.skip(input, draft, FORMAT_SKIPPED_ALREADY_PRETTY);
    }
    if (await this.overBudget(input)) return this.skip(input, draft, FORMAT_SKIPPED_BUDGET);
    const role = pickFormatRole(input, draft.markdown);
    const seen: { violation: FormatViolation | null } = { violation: null };
    const accepts = formatReplySchema.superRefine((value, context) => {
      seen.violation = this.check(draft, value.markdown, input);
      if (seen.violation !== null) {
        context.addIssue({ code: 'custom', message: seen.violation, path: ['markdown'] });
      }
    });
    try {
      const response = await this.deps.call(
        { ...input, healing: undefined },
        { jobAttemptsLeft: FORMAT_HEAL_ATTEMPTS, spendCapMicroUsd: null, spentMicroUsd: 0 },
        {
          role,
          roleKey: FORMAT_ROLE_ID,
          round: 1,
          prompt: {
            systemPrompt: buildFormatSystemPrompt(input.contentLocale),
            userPrompt: buildFormatUserPrompt(
              draft.markdown,
              draft.citations.map(({ url }) => url),
            ),
            sharedMaterial: '',
          },
          accepts,
          shapeHint: FORMAT_REPLY_SHAPE,
        },
      );
      const parsed = accepts.safeParse(parseModelJson(response.content, accepts));
      if (!parsed.success) {
        return await this.skip(
          input,
          draft,
          seen.violation ?? FORMAT_SKIPPED_REPLY_INVALID,
          response.costMicroUsd,
        );
      }
      const markdown = sanitizeDraftMarkup(escapeFormatReply(parsed.data.markdown));
      return {
        draft: { ...draft, markdown },
        status: 'FORMATTED',
        code: null,
        costMicroUsd: response.costMicroUsd ?? 0,
      };
    } catch (error: unknown) {
      if (isCancellation(error, input)) {
        throw error;
      }
      return this.skip(input, draft, seen.violation ?? FORMAT_SKIPPED_MODEL_ERROR);
    }
  }

  private check(
    draft: AuthorDraft,
    markdown: string,
    input: GenerationPipelineInput,
  ): FormatViolation | null {
    return validateFormatted({
      before: draft.markdown,
      after: sanitizeDraftMarkup(escapeFormatReply(markdown)),
      evidenceIds: draft.citations.map(({ evidenceId }) => evidenceId),
      citationUrls: draft.citations.map(({ url }) => url),
      locale: input.contentLocale,
    });
  }

  private async overBudget(input: GenerationPipelineInput): Promise<boolean> {
    const cap = input.spendCapMicroUsd;
    if (!cap) return false;
    let spent = input.spentMicroUsd ?? 0;
    try {
      spent = (await this.deps.spentMicroUsd?.(input.jobId)) ?? spent;
    } catch {
      // The persisted figure is best effort; the figure the attempt began with still bounds it.
    }
    return spent * PERCENT >= cap * FORMAT_SPEND_CEILING_PERCENT;
  }

  private async skip(
    input: GenerationPipelineInput,
    draft: AuthorDraft,
    code: string,
    costMicroUsd?: number,
  ): Promise<FormatOutcome> {
    await this.deps.record?.(input.jobId, {
      stage: 'FORMAT',
      round: 1,
      outcome: 'SKIPPED',
      roleKind: 'SYSTEM',
      roleId: FORMAT_ROLE_ID,
      code,
    });
    return { draft, status: 'SKIPPED', code, costMicroUsd: costMicroUsd ?? 0 };
  }
}

function isCancellation(error: unknown, input: GenerationPipelineInput): boolean {
  return (
    input.signal?.aborted === true ||
    error instanceof ThreadGenerationCancelledError ||
    error instanceof ThreadGenerationLeaseLostError ||
    error instanceof GenerationAttemptTimeoutError
  );
}

/** The cheapest model the owner's plan allows (ADR-181 pool, by cost rank), else the Judge's. */
export function pickFormatRole(input: GenerationPipelineInput, markdown: string): ModelRole {
  const cheapest = [...(input.healing?.pool ?? [])]
    .filter((candidate) => candidate.costRank !== undefined)
    .sort((a, b) => (a.costRank ?? 0) - (b.costRank ?? 0))[0];
  const base = cheapest ?? input.healing?.safeDefault ?? input.judge;
  const wanted = Math.ceil(estimateTextTokens(markdown) * FORMAT_OUTPUT_FACTOR);
  return {
    id: FORMAT_ROLE_ID,
    provider: base.provider,
    model: base.model,
    maxOutputTokens: Math.min(FORMAT_MAX_OUTPUT_TOKENS, Math.max(FORMAT_MIN_OUTPUT_TOKENS, wanted)),
    fallbacks: [],
  };
}
