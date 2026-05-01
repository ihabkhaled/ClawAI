import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import {
  RECIPE_DEFAULT_BLAST,
  RECIPE_DEFAULT_REVERSIBILITY,
  RECIPE_STEP_RETRY_CEILING_MS,
  RECIPE_STEP_RETRY_FLOOR_MS,
} from '../../../common/constants/recipe.constants';
import { CapabilityClass } from '../../../common/enums/capability-class.enum';
import { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';
import { CapabilityOperation } from '../../../common/enums/capability-operation.enum';
import { CapabilityApprovalManager } from '../../agent/managers/capability-approval.manager';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import {
  Prisma,
  type Recipe,
  type RecipeRun,
  type RecipeRunStep,
  type RecipeRunStepStatus,
} from '../../../generated/prisma';
import { evaluateRecipeExpression } from '../../../common/utilities/recipe-expression.utility';
import { RecipeRepository } from '../repositories/recipe.repository';
import { RecipeRunRepository } from '../repositories/recipe-run.repository';
import { dslFromJson } from '../utilities/dsl-cast.utility';
import { buildPredecessors, findStepById } from '../utilities/dsl-graph.utility';
import { resolvePlaceholders } from '../utilities/placeholder-resolver.utility';
import type { RecipeExpressionContext } from '../../../common/types/recipe-parser.types';
import type { RecipeDsl, RecipeStep } from '../types/recipe.types';
import type { StartRunDto } from '../dto/start-run.dto';
import { ProcessStepResult, type StepMetadata } from '../types/recipe-event.types';

/**
 * Stream 13 v2 — full-featured recipe runner.
 *
 * Capabilities:
 *   - DAG execution: predecessors map built from `on_success` (with
 *     implicit sequential fallback when `on_success` is absent)
 *   - Parallel groups: every "ready" step proposes concurrently
 *   - `when` expression evaluation — skip step if false
 *   - `on_error: 'abort' | 'continue' | retry { maxAttempts, backoffMs }
 *     | fallback { fallback: 'stepId' }`
 *   - Run cancellation (POST /agent/recipe-runs/:id/cancel)
 *   - Hard wall-clock timeout via the sweeper manager
 */
@Injectable()
export class RecipeRunnerManager {
  private readonly logger = new Logger(RecipeRunnerManager.name);

  constructor(
    private readonly recipeRepo: RecipeRepository,
    private readonly runRepo: RecipeRunRepository,
    private readonly approvalManager: CapabilityApprovalManager,
  ) {}

  async start(userId: string, recipeId: string, dto: StartRunDto): Promise<RecipeRun> {
    this.logger.debug(`start: userId=${userId} recipeId=${recipeId}`);
    const recipe = await this.recipeRepo.findByIdForUser(recipeId, userId);
    if (recipe === null) {
      throw new EntityNotFoundException('Recipe', recipeId);
    }
    if (!recipe.isEnabled) {
      throw new BusinessException(
        'agent.recipe.disabled',
        'RECIPE_DISABLED',
        HttpStatus.CONFLICT,
        { recipeId },
      );
    }
    const dsl = dslFromJson(recipe.dsl);
    this.validateParams(dsl, dto.params);

    const run = await this.runRepo.createRun({
      recipe: { connect: { id: recipeId } },
      userId,
      deviceId: dto.deviceId,
      status: 'RUNNING',
      params: dto.params as Prisma.InputJsonValue,
      startedAt: new Date(),
    });
    await this.seedSteps(run.id, dsl);
    void this.advance(run.id);
    return run;
  }

  async cancel(userId: string, runId: string): Promise<RecipeRun> {
    const run = await this.runRepo.findRunByIdForUser(runId, userId);
    if (run === null) {
      throw new EntityNotFoundException('RecipeRun', runId);
    }
    if (RecipeRunRepository.RUN_TERMINAL.has(run.status)) {
      throw new BusinessException(
        'agent.recipe_run.already_terminal',
        'RECIPE_RUN_ALREADY_TERMINAL',
        HttpStatus.CONFLICT,
        { current: run.status },
      );
    }
    const updated = await this.runRepo.updateRun(runId, {
      status: 'CANCELLED',
      completedAt: new Date(),
      errorMessage: 'cancelled by user',
    });
    // Mark every still-PENDING step as SKIPPED. RUNNING steps stay running
    // (their CapabilityInvocations are mid-flight; user can cancel each
    // invocation separately if desired).
    const pendingSteps = (await this.runRepo.findStepsForRun(runId)).filter(
      (s) => s.status === 'PENDING',
    );
    for (const s of pendingSteps) {
      await this.runRepo.updateStep(s.id, { status: 'SKIPPED', completedAt: new Date() });
    }
    this.logger.log(`cancel: run ${runId} cancelled (${pendingSteps.length} steps skipped)`);
    return updated;
  }

  async onStepInvocationTerminated(
    invocationId: string,
    terminalStatus: CapabilityInvocationStatus,
    output: Record<string, unknown> | null,
    errorMessage: string | null,
  ): Promise<void> {
    const step = await this.runRepo.findStepByInvocationId(invocationId);
    if (step === null) return;
    this.logger.log(
      `onStepInvocationTerminated: stepId=${step.stepId} invocationId=${invocationId} status=${String(terminalStatus)}`,
    );
    const isSuccess = terminalStatus === CapabilityInvocationStatus.EXECUTED;
    if (isSuccess) {
      await this.runRepo.updateStep(step.id, {
        status: 'SUCCEEDED',
        output: (output ?? {}) as Prisma.InputJsonValue,
        completedAt: new Date(),
      });
    } else {
      await this.handleStepFailure(step, errorMessage ?? `invocation ${String(terminalStatus)}`);
    }
    await this.advance(step.recipeRunId);
  }

  /**
   * Hard wall-clock timeout — called by the sweeper. Marks the run
   * TIMED_OUT and propagates SKIPPED to all still-PENDING steps.
   */
  async timeOut(runId: string): Promise<void> {
    await this.runRepo.updateRun(runId, {
      status: 'TIMED_OUT',
      completedAt: new Date(),
      errorMessage: 'wall-clock timeout exceeded',
    });
    const pendingSteps = (await this.runRepo.findStepsForRun(runId)).filter(
      (s) => s.status === 'PENDING',
    );
    for (const s of pendingSteps) {
      await this.runRepo.updateStep(s.id, { status: 'SKIPPED', completedAt: new Date() });
    }
    this.logger.warn(`timeOut: run ${runId} hit wall-clock cap`);
  }

  // ---------------------------------------------------------------------------

  private async advance(runId: string): Promise<void> {
    const run = await this.runRepo.findRunByIdInternal(runId);
    if (run === null) return;
    if (RecipeRunRepository.RUN_TERMINAL.has(run.status)) return;

    const recipe = await this.recipeRepo.findByIdForUser(run.recipeId, run.userId);
    if (recipe === null) {
      await this.failRun(runId, 'recipe disappeared mid-run');
      return;
    }
    const dsl = dslFromJson(recipe.dsl);
    const params = (run.params ?? {}) as Record<string, unknown>;
    const ready = this.computeReadySteps(dsl, run.steps);

    if (ready.length === 0) {
      // No PENDING steps with met predecessors. If everything is terminal
      // and at least one step ended in FAILED, the run is FAILED; else SUCCEEDED.
      const allTerminal = run.steps.every((s) => RecipeRunRepository.STEP_TERMINAL.has(s.status));
      if (!allTerminal) return; // still RUNNING steps mid-flight
      const anyFailed = run.steps.some((s) => s.status === 'FAILED');
      await this.runRepo.updateRun(runId, {
        status: anyFailed ? 'FAILED' : 'SUCCEEDED',
        completedAt: new Date(),
      });
      this.logger.log(`advance: run ${runId} reached terminal — ${anyFailed ? 'FAILED' : 'SUCCEEDED'}`);
      return;
    }

    // Propose every ready step concurrently.
    const results = await Promise.all(
      ready.map((step) => this.processStep(run, recipe, dsl, params, step)),
    );
    // If any step was SKIPPED synchronously, re-run advance to check
    // whether the run can now reach a terminal state.
    if (results.includes(ProcessStepResult.SKIPPED)) {
      await this.advance(runId);
    }
  }

  /**
   * The "ready set" — steps that are PENDING and whose predecessors are
   * all SUCCEEDED or SKIPPED. (Predecessors that ended FAILED block the
   * step UNLESS this step is a fallback declared from that failed step.)
   */
  private computeReadySteps(dsl: RecipeDsl, stepRows: RecipeRunStep[]): RecipeRunStep[] {
    const predecessors = buildPredecessors(dsl);
    const stepStatusById = new Map<string, RecipeRunStepStatus>(
      stepRows.map((s) => [s.stepId, s.status]),
    );
    const ready: RecipeRunStep[] = [];
    for (const row of stepRows) {
      if (row.status !== 'PENDING') continue;
      // Skip if waiting on a retry timer
      const md = this.metadata(row);
      if (md.retryScheduledFor !== undefined && Date.now() < md.retryScheduledFor) continue;
      const deps = predecessors.get(row.stepId);
      if (deps === undefined || deps.size === 0) {
        ready.push(row);
        continue;
      }
      const depsSatisfied = [...deps].every((depId) => {
        const depStatus = stepStatusById.get(depId);
        return depStatus === 'SUCCEEDED' || depStatus === 'SKIPPED';
      });
      if (depsSatisfied) ready.push(row);
    }
    return ready;
  }

  private async processStep(
    run: RecipeRun,
    recipe: Recipe,
    dsl: RecipeDsl,
    params: Record<string, unknown>,
    stepRow: RecipeRunStep,
  ): Promise<ProcessStepResult> {
    const dslStep = findStepById(dsl, stepRow.stepId);
    if (dslStep === undefined) {
      await this.markStepFailed(stepRow, `step ${stepRow.stepId} missing in DSL`);
      return ProcessStepResult.FAILED;
    }
    const ctx = await this.buildContext(run.id, params);
    if (dslStep.when !== undefined && !this.evaluateWhen(dslStep.when, ctx)) {
      await this.runRepo.updateStep(stepRow.id, {
        status: 'SKIPPED',
        completedAt: new Date(),
        errorMessage: null,
      });
      this.logger.debug(`processStep: stepId=${dslStep.id} when=false → SKIPPED`);
      return ProcessStepResult.SKIPPED;
    }
    await this.proposeStep(run, recipe, dsl, ctx, stepRow, dslStep);
    return ProcessStepResult.PROPOSED;
  }

  private evaluateWhen(when: string, ctx: RecipeExpressionContext): boolean {
    try {
      const result = evaluateRecipeExpression(when, ctx);
      return Boolean(result);
    } catch (error) {
      this.logger.warn(`evaluateWhen: '${when}' threw — treating as false: ${(error as Error).message}`);
      return false;
    }
  }

  private async proposeStep(
    run: RecipeRun,
    recipe: Recipe,
    _dsl: RecipeDsl,
    ctx: RecipeExpressionContext,
    stepRow: RecipeRunStep,
    dslStep: RecipeStep,
  ): Promise<void> {
    const target = resolvePlaceholders(dslStep.target, ctx) as Record<string, unknown>;
    const payload = resolvePlaceholders(dslStep.payload ?? {}, ctx) as Record<string, unknown>;
    try {
      const proposal = await this.approvalManager.propose(run.userId, {
        deviceId: run.deviceId,
        capabilityClass: dslStep.capabilityClass as CapabilityClass,
        capabilityOperation: dslStep.capabilityOperation as CapabilityOperation,
        targetDescriptor: target,
        payload,
        blastRadius: RECIPE_DEFAULT_BLAST,
        reversibility: RECIPE_DEFAULT_REVERSIBILITY,
        requiredScopes: [],
        recipeRunId: run.id,
        metadata: { recipeId: recipe.id, stepId: dslStep.id },
      });
      const md = this.metadata(stepRow);
      await this.runRepo.updateStep(stepRow.id, {
        status: 'RUNNING',
        invocationId: proposal.id,
        startedAt: new Date(),
        // clear any prior retry timer
        ...(md.retryScheduledFor !== undefined ? { errorMessage: null } : {}),
      });
      this.logger.log(
        `proposeStep: runId=${run.id} stepId=${dslStep.id} invocationId=${proposal.id} status=${proposal.status}`,
      );
    } catch (error) {
      this.logger.error(
        `proposeStep: failed to propose stepId=${dslStep.id}: ${(error as Error).message}`,
      );
      await this.handleStepFailure(stepRow, (error as Error).message);
    }
  }

  /**
   * Single point of failure handling. Routes the failed step through
   * its declared `on_error` policy, then advances the run.
   */
  private async handleStepFailure(stepRow: RecipeRunStep, errorMessage: string): Promise<void> {
    const run = await this.runRepo.findRunByIdInternal(stepRow.recipeRunId);
    if (run === null) return;
    const recipe = await this.recipeRepo.findByIdForUser(run.recipeId, run.userId);
    const dslStep =
      recipe === null ? undefined : findStepById(dslFromJson(recipe.dsl), stepRow.stepId);
    const policy = dslStep?.on_error;

    if (policy === undefined || policy === 'abort') {
      await this.markStepFailed(stepRow, errorMessage);
      await this.failRun(stepRow.recipeRunId, errorMessage);
      return;
    }
    if (policy === 'continue') {
      await this.markStepFailed(stepRow, errorMessage);
      return; // run stays RUNNING; siblings continue
    }
    if (typeof policy === 'object' && 'retry' in policy) {
      await this.scheduleRetry(stepRow, policy.retry, errorMessage);
      return;
    }
    if (typeof policy === 'object' && 'fallback' in policy) {
      await this.markStepFailed(stepRow, errorMessage);
      await this.queueFallback(run.id, policy.fallback, stepRow.stepId);
      return;
    }
    await this.markStepFailed(stepRow, errorMessage);
    await this.failRun(stepRow.recipeRunId, errorMessage);
  }

  private async scheduleRetry(
    stepRow: RecipeRunStep,
    retry: { maxAttempts: number; backoffMs: number },
    errorMessage: string,
  ): Promise<void> {
    const md = this.metadata(stepRow);
    const attempt = (md.attempt ?? 0) + 1;
    if (attempt > retry.maxAttempts) {
      await this.markStepFailed(stepRow, `retry exhausted after ${String(attempt - 1)}: ${errorMessage}`);
      await this.failRun(stepRow.recipeRunId, errorMessage);
      return;
    }
    const backoffMs = Math.max(
      RECIPE_STEP_RETRY_FLOOR_MS,
      Math.min(RECIPE_STEP_RETRY_CEILING_MS, retry.backoffMs),
    );
    const retryAt = Date.now() + backoffMs;
    await this.runRepo.updateStep(stepRow.id, {
      status: 'PENDING',
      invocationId: null,
      errorMessage: `attempt ${String(attempt)} failed: ${errorMessage}`,
    });
    // store retry metadata via a separate update so we don't lose it
    await this.runRepo.updateStepMetadata(stepRow.id, {
      ...md,
      attempt,
      retryScheduledFor: retryAt,
    });
    this.logger.warn(
      `scheduleRetry: stepId=${stepRow.stepId} attempt=${String(attempt)}/${String(retry.maxAttempts)} retryAt=${String(retryAt)}`,
    );
    setTimeout(() => {
      void this.advance(stepRow.recipeRunId);
    }, backoffMs);
  }

  private async queueFallback(
    runId: string,
    fallbackId: string,
    failedFromStepId: string,
  ): Promise<void> {
    const steps = await this.runRepo.findStepsForRun(runId);
    const fallback = steps.find((s) => s.stepId === fallbackId);
    if (fallback === undefined) {
      this.logger.warn(`queueFallback: fallback step ${fallbackId} not found in run ${runId}`);
      return;
    }
    if (fallback.status !== 'SKIPPED' && fallback.status !== 'PENDING') {
      this.logger.debug(
        `queueFallback: fallback step ${fallbackId} already in terminal state ${fallback.status}; ignoring`,
      );
      return;
    }
    const md = this.metadata(fallback);
    // Force the fallback into PENDING and clear blocking deps via metadata flag
    await this.runRepo.updateStep(fallback.id, {
      status: 'PENDING',
    });
    await this.runRepo.updateStepMetadata(fallback.id, {
      ...md,
      fallbackOf: failedFromStepId,
    });
  }

  private async markStepFailed(stepRow: RecipeRunStep, errorMessage: string): Promise<void> {
    await this.runRepo.updateStep(stepRow.id, {
      status: 'FAILED',
      errorMessage,
      completedAt: new Date(),
    });
  }

  private metadata(stepRow: RecipeRunStep): StepMetadata {
    if (stepRow.metadata === null || stepRow.metadata === undefined) return {};
    if (typeof stepRow.metadata !== 'object') return {};
    return stepRow.metadata as StepMetadata;
  }

  // ---------------------------------------------------------------------------

  private async buildContext(
    runId: string,
    params: Record<string, unknown>,
  ): Promise<RecipeExpressionContext> {
    const steps = await this.runRepo.findStepsForRun(runId);
    const stepsCtx: Record<string, { output: Record<string, unknown> }> = {};
    for (const s of steps) {
      stepsCtx[s.stepId] = { output: (s.output ?? {}) as Record<string, unknown> };
    }
    return { params, steps: stepsCtx };
  }

  private async seedSteps(runId: string, dsl: RecipeDsl): Promise<void> {
    const rows = dsl.steps.map((s, idx) => ({
      recipeRunId: runId,
      stepId: s.id,
      stepIndex: idx,
      status: 'PENDING' as const,
    }));
    await this.runRepo.createSteps(rows);
  }

  private validateParams(dsl: RecipeDsl, supplied: Record<string, unknown>): void {
    if (dsl.parameters === undefined) return;
    for (const decl of dsl.parameters) {
      if (decl.required && !(decl.name in supplied)) {
        throw new BusinessException(
          'agent.recipe.missing_param',
          'RECIPE_PARAM_REQUIRED',
          HttpStatus.BAD_REQUEST,
          { paramName: decl.name },
        );
      }
    }
  }

  private async failRun(runId: string, errorMessage: string): Promise<void> {
    await this.runRepo.updateRun(runId, {
      status: 'FAILED',
      errorMessage,
      completedAt: new Date(),
    });
    this.logger.warn(`failRun: ${runId} — ${errorMessage}`);
  }
}
