import { estimateTextTokens } from '@claw/shared-utilities';
import { ServiceUnavailableException } from '@nestjs/common';
import type { ThreadFailureClass, ThreadHealingStrategy } from '@claw/shared-types';

import { ChatModelIncompleteError } from '../../models/chat-model-incomplete.error';
import type { ChatModelResponse } from '../../models/chat-model.client';
import { findUpstreamError } from '../../models/chat-upstream.error';
import { OUTPUT_INVALID_CODE, REPAIR_NOTE_MAX_CHARS } from '../constants/generation.constants';
import { OUTPUT_CUSTOM_ISSUE_TEXT } from '../constants/output-failure.constants';
import {
  CHAT_GATEWAY_USER_PROMPT_MAX_CHARS,
  HEAL_SPEND_CEILING_PERCENT,
  HEAL_STOPPED_BUDGET_CODE,
  HEAL_STOPPED_OWNER_CODE,
  HEAL_STOPPED_SPEND_CODE,
  JSON_REPAIR_INPUT_MAX_CHARS,
  MAX_HEAL_ATTEMPTS_PER_ROLE,
  MAX_PROACTIVE_SHRINK_LEVEL,
  PERCENT_DIVISOR,
} from '../constants/healing.constants';
import {
  JSON_REPAIR_REPLY_LEAD,
  JSON_REPAIR_SYSTEM_PROMPT,
  JSON_REPAIR_USER_LEAD,
} from '../constants/healing-notes.constants';
import { ROLE_MAX_MS } from '../constants/output-retry.constants';
import { STEP_FALLBACK_ERROR_CODE } from '../constants/step-recorder.constants';
import type { CandidateOutcome } from '../types/candidate-outcome.types';
import type { GenerationPipelineInput } from '../types/generation-pipeline.types';
import type {
  AttemptFailure,
  HealerDeps,
  HealingBudget,
  OnModelStep,
  PlanNextState,
  QueuedCandidate,
  RoleAttempt,
  RoleCallSpec,
} from '../types/healing.types';
import type { StepRecordInput } from '../types/step-recorder.types';
import { CandidatesExhaustedError } from '../utilities/candidates-exhausted.error';
import { classifyFailure } from '../utilities/classify-failure.utility';
import {
  classifyModelOutput,
  describeOutputFailure,
} from '../utilities/describe-output-failure.utility';
import { isDeterministicGenerationError } from '../utilities/deterministic-generation.error';
import { escalatedOutputTokens } from '../utilities/escalate-output-tokens.utility';
import {
  buildCandidateQueue,
  candidateKey,
  orderAfterFailure,
  preferDistinctModels,
  swapStrategy,
} from '../utilities/healing-candidates.utility';
import { nextOnModelStep } from '../utilities/healing-ladder.utility';
import { parseModelJson } from '../utilities/parse-model-json.utility';
import { parseStepError } from '../utilities/parse-step-error.utility';
import { roleStepInfo } from '../utilities/role-step.utility';
import { shrinkSharedMaterial } from '../utilities/shrink-source.utility';
import { ThreadGenerationCancelledError } from '../utilities/thread-generation-cancelled.error';
import { GenerationAttemptTimeoutError } from '../utilities/generation-attempt-timeout.error';

/**
 * Runs one model role to an accepted reply, healing on the way (ADR-181). A failed call is
 * classified, then the next rung of its class's ladder is tried on the same model (wait, stricter
 * prompt, JSON repair pass, more or less output room, a shorter source); when those are spent the
 * role moves to the next model: the owner's backups, the plan-allowed pool, the safe default.
 * Bounded three ways: attempts per role, attempts per job attempt, and the job's spend cap.
 */
export class RoleHealer {
  /** The model each author is running now (or answered with), per job attempt; freed with the input. */
  private readonly authorModels = new WeakMap<GenerationPipelineInput, Map<string, string>>();
  private readonly successfulModels = new WeakMap<GenerationPipelineInput, Map<string, string>>();

  constructor(private readonly deps: HealerDeps) {}

  private isAuthor(input: GenerationPipelineInput, roleId: string): boolean {
    return input.authors.some(({ id }) => id === roleId);
  }

  /** `provider/model` keys the OTHER authors use: their picks, replaced by what they run now. */
  private takenByOtherAuthors(input: GenerationPipelineInput, roleId: string): Set<string> {
    const live = this.authorModels.get(input);
    const taken = new Set<string>();
    for (const author of input.authors) {
      if (author.id === roleId) continue;
      taken.add(live?.get(author.id) ?? candidateKey(author));
    }
    return taken;
  }

  private claim(input: GenerationPipelineInput, roleId: string, key: string): void {
    if (!this.isAuthor(input, roleId)) return;
    const live = this.authorModels.get(input) ?? new Map<string, string>();
    live.set(roleId, key);
    this.authorModels.set(input, live);
  }

  async call(
    input: GenerationPipelineInput,
    budget: HealingBudget,
    spec: RoleCallSpec,
  ): Promise<ChatModelResponse> {
    const { role } = spec;
    const initialPrompt = this.promptFor(spec, '', 0);
    const neededTokens =
      estimateTextTokens(`${initialPrompt.systemPrompt}\n${initialPrompt.userPrompt}`) +
      role.maxOutputTokens;
    const demoted = await this.deps.loadDemoted(input.jobId, role.id);
    const queue = buildCandidateQueue({
      role,
      healing: input.healing,
      demoted,
      health: await this.deps.loadHealth(),
      neededTokens,
    });
    const deadline = this.deps.now() + ROLE_MAX_MS;
    const distinct = (candidates: readonly QueuedCandidate[]): QueuedCandidate[] =>
      this.isAuthor(input, role.id)
        ? preferDistinctModels(candidates, this.takenByOtherAuthors(input, role.id))
        : [...candidates];
    const { stage, roleKind } = roleStepInfo(spec.roleKey);
    const outcomes: CandidateOutcome[] = [];
    const counter = { attempts: 0 };
    const lastSuccess =
      this.successfulModels.get(input)?.get(role.id) ??
      (await this.deps.loadSuccessful?.(input.jobId, role.id)) ??
      null;
    const successful = queue.find(
      (candidate) =>
        candidateKey(candidate) === lastSuccess && !demoted.has(candidateKey(candidate)),
    );
    let remaining = distinct(
      successful ? [successful, ...queue.filter((candidate) => candidate !== successful)] : queue,
    );
    let lastError: unknown;
    let everyFailureDeterministic = true;
    let previous: AttemptFailure | null = null;
    for (let index = 0; remaining.length > 0; index += 1) {
      const [candidate, ...rest] = remaining;
      if (!candidate) break;
      remaining = distinct(rest);
      this.claim(input, role.id, candidateKey(candidate));
      const step = { stage, round: spec.round, roleKind, roleId: role.id, ...candidate };
      if (index > 0) {
        const stop = this.stopReason(budget, counter, deadline);
        if (stop !== null) {
          await this.noteStop(input, step, stop);
          break;
        }
        await this.recordSwap(input, step, candidate, previous);
      }
      const result = await this.tryCandidate(input, budget, spec, {
        step,
        candidate,
        index,
        deadline,
        counter,
      });
      if ('response' in result) {
        const successes = this.successfulModels.get(input) ?? new Map<string, string>();
        successes.set(role.id, candidateKey(candidate));
        this.successfulModels.set(input, successes);
        return result.response;
      }
      if (this.successfulModels.get(input)?.get(role.id) === candidateKey(candidate)) {
        this.successfulModels.get(input)?.delete(role.id);
      }
      outcomes.push(result.failure);
      everyFailureDeterministic &&= result.deterministic;
      lastError = result.error;
      previous = result;
      if (result.ownerOnly) {
        await this.noteStop(input, step, HEAL_STOPPED_OWNER_CODE);
        break;
      }
      remaining = distinct(
        orderAfterFailure(
          remaining,
          candidate.provider,
          classifyFailure({ code: result.failure.code, httpStatus: result.failure.httpStatus })
            .failureClass,
        ),
      );
    }
    throw this.exhaustedError(outcomes, lastError, everyFailureDeterministic);
  }

  /** Why no further healing attempt may start now, or null when one may. */
  private stopReason(
    budget: HealingBudget,
    counter: { attempts: number },
    deadline: number,
  ): string | null {
    if (counter.attempts >= MAX_HEAL_ATTEMPTS_PER_ROLE || budget.jobAttemptsLeft <= 0) {
      return HEAL_STOPPED_BUDGET_CODE;
    }
    if (this.deps.now() > deadline) return HEAL_STOPPED_BUDGET_CODE;
    return this.overSpendCeiling(budget) ? HEAL_STOPPED_SPEND_CODE : null;
  }

  private overSpendCeiling(budget: HealingBudget): boolean {
    return (
      budget.spendCapMicroUsd !== null &&
      budget.spentMicroUsd * PERCENT_DIVISOR >= budget.spendCapMicroUsd * HEAL_SPEND_CEILING_PERCENT
    );
  }

  private async noteStop(
    input: GenerationPipelineInput,
    step: Omit<StepRecordInput, 'outcome'>,
    code: string,
  ): Promise<void> {
    await this.deps.record(input.jobId, { ...step, outcome: 'SKIPPED', code });
  }

  private async recordSwap(
    input: GenerationPipelineInput,
    step: Omit<StepRecordInput, 'outcome'>,
    candidate: QueuedCandidate,
    previous: AttemptFailure | null,
  ): Promise<void> {
    const failureClass =
      previous === null
        ? null
        : classifyFailure({ code: previous.failure.code, httpStatus: previous.failure.httpStatus })
            .failureClass;
    await this.deps.record(input.jobId, {
      ...step,
      outcome: 'FALLBACK',
      code: swapStrategy(candidate.origin),
      rawExcerpt: failureClass,
    });
  }

  /**
   * One model: ask, and on a refused or failed reply apply the class's next rung and ask again,
   * until a reply is accepted or the rungs, the attempt budget or the spend guard run out.
   */
  private async tryCandidate(
    input: GenerationPipelineInput,
    budget: HealingBudget,
    spec: RoleCallSpec,
    run: {
      step: Omit<StepRecordInput, 'outcome'>;
      candidate: QueuedCandidate;
      index: number;
      deadline: number;
      counter: { attempts: number };
    },
  ): Promise<RoleAttempt> {
    const { step, candidate } = run;
    const used = new Set<ThreadHealingStrategy>();
    let outcome: AttemptFailure = {
      failure: {
        provider: candidate.provider,
        model: candidate.model,
        code: STEP_FALLBACK_ERROR_CODE,
        httpStatus: null,
      },
      error: undefined,
      deterministic: true,
      ownerOnly: false,
    };
    let maxOutputTokens = spec.role.maxOutputTokens;
    let note = '';
    let shrinkLevel = 0;
    let waits = 0;
    let lastReply = '';
    let repairPass = false;
    for (let attempt = 1; ; attempt += 1) {
      if (attempt > 1) {
        if (this.stopReason(budget, run.counter, run.deadline) !== null) break;
        run.counter.attempts += 1;
        budget.jobAttemptsLeft -= 1;
      }
      await this.deps.throwIfCancelled(input);
      const requestId = `${input.jobId}:${spec.roleKey}:round-${String(spec.round)}:attempt-${String(input.attempt)}:cand-${String(run.index + 1)}${attempt > 1 ? `:try-${String(attempt)}` : ''}`;
      await this.deps.record(input.jobId, { ...step, outcome: 'STARTED' });
      const startedAt = this.deps.now();
      const prompt = repairPass
        ? this.repairPrompt(spec, lastReply)
        : this.promptFor(spec, note, shrinkLevel);
      try {
        const response = await this.deps.generate({
          ownerId: input.ownerId,
          requestId,
          budgetId: input.budgetId,
          provider: candidate.provider,
          model: candidate.model,
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          maxOutputTokens,
          signal: input.signal,
        });
        budget.spentMicroUsd += response.costMicroUsd ?? 0;
        // Paid for even if the job is cancelled or the answer is unusable, so counted first.
        await this.deps.recordSpend(input.jobId, input.budgetId, response.costMicroUsd);
        await this.deps.throwIfCancelled(input);
        const accepted = spec.accepts.safeParse(
          parseModelJson(response.content, spec.accepts),
        ).success;
        if (accepted) {
          await this.deps.record(input.jobId, {
            ...step,
            outcome: 'SUCCEEDED',
            code: null,
            durationMs: response.durationMs,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            rawExcerpt: response.content,
          });
          return { response };
        }
        lastReply = response.content;
        const reason = describeOutputFailure(response.content, spec.accepts).slice(
          0,
          REPAIR_NOTE_MAX_CHARS,
        );
        const classification = classifyFailure({
          code: OUTPUT_INVALID_CODE,
          httpStatus: null,
          outputKind: classifyModelOutput(response.content, spec.accepts),
          citationRule: reason.includes(OUTPUT_CUSTOM_ISSUE_TEXT),
        });
        const next = this.planNext({
          failureClass: classification.failureClass,
          used,
          input,
          spec,
          maxOutputTokens,
          waits,
          retryAfterMs: null,
          httpStatus: null,
          reason,
          lastReply,
        });
        await this.deps.record(input.jobId, {
          ...step,
          outcome: next === null ? 'FAILED' : 'RETRY',
          code: OUTPUT_INVALID_CODE,
          durationMs: response.durationMs,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          rawExcerpt: describeOutputFailure(response.content, spec.accepts),
        });
        outcome = {
          failure: { ...outcome.failure, code: OUTPUT_INVALID_CODE, httpStatus: null },
          error: new ServiceUnavailableException('A model returned invalid structured output'),
          deterministic: false,
          ownerOnly: false,
        };
        if (next === null) break;
        used.add(next.strategy);
        repairPass = next.repairPass;
        maxOutputTokens = next.maxOutputTokens;
        note = next.note;
        if (next.shrinkSource) shrinkLevel += 1;
        await this.recordHeal(input, step, next.strategy, classification.failureClass);
        continue;
      } catch (caught: unknown) {
        if (caught instanceof ThreadGenerationCancelledError) throw caught;
        await this.recordCallFailure(input, budget, step, caught, startedAt);
        const parsed = parseStepError(caught);
        const upstream = findUpstreamError(caught);
        const retryAfterMs = upstream?.retryAfterMs ?? null;
        const classification = classifyFailure({
          code: parsed.code,
          httpStatus: parsed.httpStatus,
        });
        const deterministic = isDeterministicGenerationError(caught);
        outcome = {
          failure: { ...outcome.failure, code: parsed.code, httpStatus: parsed.httpStatus },
          error: caught,
          deterministic,
          ownerOnly: classification.ownerOnly,
        };
        if (classification.ownerOnly) break;
        const next = this.planNext({
          failureClass: classification.failureClass,
          used,
          input,
          spec,
          maxOutputTokens,
          waits,
          retryAfterMs,
          httpStatus: parsed.httpStatus,
          reason: parsed.code,
          lastReply,
        });
        if (next === null) break;
        used.add(next.strategy);
        repairPass = false;
        maxOutputTokens = next.maxOutputTokens;
        note = next.note;
        if (next.shrinkSource) shrinkLevel += 1;
        await this.recordHeal(input, step, next.strategy, classification.failureClass);
        if (next.delayMs > 0) {
          waits += 1;
          await this.deps.wait(next.delayMs, input.signal);
        }
      }
    }
    return outcome;
  }

  /** The next rung that would really change the request, or null. A rung that cannot apply is skipped. */
  private planNext(state: PlanNextState): OnModelStep | null {
    const used = new Set(state.used);
    for (;;) {
      const next = nextOnModelStep(
        {
          failureClass: state.failureClass,
          used,
          baseMaxOutputTokens: state.spec.role.maxOutputTokens,
          currentMaxOutputTokens: state.maxOutputTokens,
          retryAfterMs: state.retryAfterMs,
          httpStatus: state.httpStatus,
          waits: state.waits,
          reason: state.reason,
          raisedMaxOutputTokens: escalatedOutputTokens(
            state.maxOutputTokens,
            state.input.contentLocale,
          ),
        },
        this.deps.random,
      );
      if (next === null) return null;
      const noShared = next.shrinkSource && !state.spec.prompt.sharedMaterial;
      const noReply =
        next.repairPass &&
        (state.lastReply.length === 0 || state.lastReply.length > JSON_REPAIR_INPUT_MAX_CHARS);
      if (!noShared && !noReply) return next;
      used.add(next.strategy);
    }
  }

  private promptFor(
    spec: RoleCallSpec,
    note: string,
    shrinkLevel: number,
  ): { systemPrompt: string; userPrompt: string } {
    const { prompt } = spec;
    const shared = prompt.sharedMaterial;
    if (!shared)
      return { systemPrompt: prompt.systemPrompt, userPrompt: `${prompt.userPrompt}${note}` };
    const shrunkAt = (level: number): string =>
      prompt.userPrompt.replace(shared, shrinkSharedMaterial(shared, level));
    // Levels the source needs before the prompt fits the gateway at all (0 when it already fits).
    let base = prompt.userPrompt;
    let fitLevel = 0;
    while (
      base.length + note.length > CHAT_GATEWAY_USER_PROMPT_MAX_CHARS &&
      fitLevel < MAX_PROACTIVE_SHRINK_LEVEL
    ) {
      fitLevel += 1;
      const shortened = shrunkAt(fitLevel);
      if (shortened.length < base.length) base = shortened;
    }
    // A shrink rung goes below what already fits: a provider that refused the fitted prompt with a
    // 413 (smaller tier) must receive a smaller one, not the same one again.
    return {
      systemPrompt: prompt.systemPrompt,
      userPrompt: `${shrinkLevel > 0 ? shrunkAt(fitLevel + shrinkLevel) : base}${note}`,
    };
  }

  private repairPrompt(
    spec: RoleCallSpec,
    reply: string,
  ): { systemPrompt: string; userPrompt: string } {
    return {
      systemPrompt: JSON_REPAIR_SYSTEM_PROMPT,
      userPrompt: `${JSON_REPAIR_USER_LEAD}${spec.shapeHint}${JSON_REPAIR_REPLY_LEAD}${reply.slice(0, JSON_REPAIR_INPUT_MAX_CHARS)}`,
    };
  }

  private async recordHeal(
    input: GenerationPipelineInput,
    step: Omit<StepRecordInput, 'outcome'>,
    strategy: ThreadHealingStrategy,
    failureClass: ThreadFailureClass,
  ): Promise<void> {
    await this.deps.record(input.jobId, {
      ...step,
      outcome: 'RETRY',
      code: strategy,
      rawExcerpt: failureClass,
    });
  }

  /**
   * Counts the spend and records the failed step. A cancel is not a step failure and ends the
   * role at once; so does a spent attempt time budget. Both are rethrown.
   */
  private async recordCallFailure(
    input: GenerationPipelineInput,
    budget: HealingBudget,
    step: Omit<StepRecordInput, 'outcome'>,
    error: unknown,
    startedAt: number,
  ): Promise<void> {
    if (error instanceof ChatModelIncompleteError) {
      budget.spentMicroUsd += error.costMicroUsd;
      await this.deps.recordSpend(input.jobId, input.budgetId, error.costMicroUsd);
    }
    const parsed = parseStepError(error);
    await this.deps.record(input.jobId, {
      ...step,
      outcome: 'FAILED',
      code: parsed.code,
      httpStatus: parsed.httpStatus,
      durationMs: this.deps.now() - startedAt,
      rawExcerpt: findUpstreamError(error)?.upstreamMessage ?? null,
    });
    if (error instanceof GenerationAttemptTimeoutError) throw error;
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
}
