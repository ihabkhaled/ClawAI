import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { ConnectorAction } from '../../connector-access/enums/connector-action.enum';
import { ConnectorAccessService } from '../../connector-access/services/connector-access.service';
import { WorkspaceAdapterFactory } from '../../workspace/adapters/workspace-adapter.factory';
import { TokenRefreshManager } from '../../workspace/managers/token-refresh.manager';
import { WorkspaceConnectorRepository } from '../../workspace/repositories/workspace-connector.repository';
import { ChainRepository } from '../repositories/chain.repository';
import { resolveChainPayload } from '../utilities/chain-placeholder-resolver.utility';
import type { ChainDsl, ChainRunView, ChainStep, ChainStepOutputs } from '../types/chain.types';
import type { Prisma, WorkspaceProvider } from '../../../generated/prisma';
import type { WorkspaceProvider as ProviderEnum } from '../../../common/enums/workspace-provider.enum';

// v3 round 12 (2026-05-14) — Prompt 11: cross-workspace chain executor.
//
// Runs a chain SEQUENTIALLY (step 1 → 2 → 3). Each step:
//   1. resolves {{steps.*.output.*}} placeholders from earlier steps;
//   2. checks the caller has PROPOSE_AI_ACTION access on the step's
//      connector (chains execute write actions, so reuse the same RBAC
//      gate as the approval queue);
//   3. calls the provider adapter's executeWriteAction;
//   4. records the WriteActionResult so later steps can reference it.
//
// Any step failure (unresolved placeholder, access denied, adapter
// error, adapter returns success=false) fails the step AND the run,
// and execution stops — a chain is all-or-nothing by design.
@Injectable()
export class ChainExecutorManager {
  private readonly logger = new Logger(ChainExecutorManager.name);

  constructor(
    private readonly chainRepo: ChainRepository,
    private readonly connectorRepo: WorkspaceConnectorRepository,
    private readonly adapterFactory: WorkspaceAdapterFactory,
    private readonly tokenRefresh: TokenRefreshManager,
    private readonly accessService: ConnectorAccessService,
  ) {}

  async run(userId: string, chainId: string): Promise<ChainRunView> {
    const chain = await this.chainRepo.findById(chainId);
    if (chain === null || chain.userId !== userId) {
      throw new BusinessException('workspace.chain.not_found', 'NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (!chain.isEnabled) {
      throw new BusinessException(
        'workspace.chain.disabled',
        'CHAIN_DISABLED',
        HttpStatus.BAD_REQUEST,
      );
    }
    const dsl = chain.dsl as unknown as ChainDsl;
    const runRow = await this.chainRepo.createRun({
      chainId,
      userId,
      status: 'RUNNING',
      dslSnapshot: chain.dsl as Prisma.InputJsonValue,
      startedAt: new Date(),
    });

    return this.executeFromIndex(userId, runRow.id, dsl, {}, 0);
  }

  /**
   * Phase 05 (scoped safety-net slice) — resumes a FAILED run from its
   * first non-SUCCEEDED step instead of re-running the whole chain from
   * scratch. Already-SUCCEEDED steps are never re-executed — their stored
   * `output` is reused as-is — which is what makes this safe: retrying a
   * write action that already completed (e.g. re-running CREATE_ISSUE)
   * would create a duplicate external side effect, and none of these
   * provider APIs support a real idempotency key to prevent that. Skipping
   * already-succeeded steps sidesteps the problem entirely rather than
   * papering over it with an unenforced idempotency field.
   *
   * Uses the run's `dslSnapshot`, not the chain's current (possibly since
   * edited) `dsl`, so a resume always continues the exact definition that
   * was actually running — the same reasoning `dslSnapshot` already exists
   * for in `run()`.
   */
  async resume(userId: string, chainId: string, runId: string): Promise<ChainRunView> {
    const chain = await this.chainRepo.findById(chainId);
    if (chain === null || chain.userId !== userId) {
      throw new BusinessException('workspace.chain.not_found', 'NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const run = await this.chainRepo.findRunWithSteps(runId);
    if (run === null || run.chainId !== chainId || run.userId !== userId) {
      throw new BusinessException(
        'workspace.chain.run_not_found',
        'NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    if (run.status !== 'FAILED') {
      throw new BusinessException(
        'workspace.chain.run_not_resumable',
        'RUN_NOT_RESUMABLE',
        HttpStatus.BAD_REQUEST,
        { status: run.status },
      );
    }

    const dsl = run.dslSnapshot as unknown as ChainDsl;
    const outputs: ChainStepOutputs = {};
    let resumeIndex = dsl.steps.length;
    for (let i = 0; i < dsl.steps.length; i += 1) {
      const step = dsl.steps[i];
      if (step === undefined) continue;
      const priorAttempt = run.steps.find((s) => s.stepId === step.id && s.status === 'SUCCEEDED');
      if (priorAttempt === undefined) {
        resumeIndex = i;
        break;
      }
      outputs[step.id] = (priorAttempt.output as Record<string, unknown> | null) ?? {};
    }

    await this.chainRepo.updateRun(runId, { status: 'RUNNING', error: null, finishedAt: null });
    return this.executeFromIndex(userId, runId, dsl, outputs, resumeIndex);
  }

  private async executeFromIndex(
    userId: string,
    runId: string,
    dsl: ChainDsl,
    outputs: ChainStepOutputs,
    startIndex: number,
  ): Promise<ChainRunView> {
    let runFailed = false;
    let runError: string | null = null;

    for (let i = startIndex; i < dsl.steps.length; i += 1) {
      const step = dsl.steps[i];
      if (step === undefined) continue;
      const stepResult = await this.executeStep(userId, runId, step, i, outputs);
      if (!stepResult.ok) {
        runFailed = true;
        runError = stepResult.error;
        break;
      }
      outputs[step.id] = stepResult.output;
    }

    await this.chainRepo.updateRun(runId, {
      status: runFailed ? 'FAILED' : 'COMPLETED',
      error: runError,
      finishedAt: new Date(),
    });
    this.logger.log(`run: runId=${runId} status=${runFailed ? 'FAILED' : 'COMPLETED'}`);
    return this.buildRunView(runId);
  }

  // Executes one step. Returns { ok, output } on success or
  // { ok: false, error } on any failure (the run stops on the first).
  private async executeStep(
    userId: string,
    runId: string,
    step: ChainStep,
    index: number,
    outputs: ChainStepOutputs,
  ): Promise<{ ok: true; output: Record<string, unknown> } | { ok: false; error: string }> {
    const stepRow = await this.chainRepo.createStep({
      runId,
      stepId: step.id,
      stepIndex: index,
      connectorId: step.connectorId,
      actionType: step.actionType,
      status: 'RUNNING',
      startedAt: new Date(),
    });

    const fail = async (error: string): Promise<{ ok: false; error: string }> => {
      await this.chainRepo.updateStep(stepRow.id, {
        status: 'FAILED',
        error,
        finishedAt: new Date(),
      });
      return { ok: false, error: `step ${step.id}: ${error}` };
    };

    const { payload, unresolved } = resolveChainPayload(step.payload, outputs);
    if (unresolved.length > 0) {
      return fail(`unresolved placeholders: ${unresolved.join(', ')}`);
    }

    const canPropose = await this.accessService.can(
      userId,
      step.connectorId,
      ConnectorAction.PROPOSE_AI_ACTION,
    );
    if (!canPropose) {
      return fail(`no access to connector ${step.connectorId}`);
    }

    const connector = await this.connectorRepo.findById(step.connectorId);
    if (connector === null || connector.encryptedTokens === null) {
      return fail(`connector ${step.connectorId} missing or unauthenticated`);
    }
    const accessToken = await this.tokenRefresh.getValidAccessToken(connector);
    if (accessToken === null || accessToken.length === 0) {
      return fail(`could not resolve a valid token for connector ${step.connectorId}`);
    }

    const adapter = this.adapterFactory.getAdapter(
      connector.provider as WorkspaceProvider as ProviderEnum,
    );
    if (adapter.executeWriteAction === undefined) {
      return fail(`provider ${connector.provider} has no executeWriteAction`);
    }

    try {
      const result = await adapter.executeWriteAction(accessToken, step.actionType, payload);
      if (!result.success) {
        await this.chainRepo.updateStep(stepRow.id, {
          status: 'FAILED',
          resolvedPayload: payload as Prisma.InputJsonValue,
          error: result.errorMessage ?? 'adapter returned success=false',
          finishedAt: new Date(),
        });
        return { ok: false, error: `step ${step.id}: ${result.errorMessage ?? 'failed'}` };
      }
      // The output object later steps can reference via placeholders.
      const output: Record<string, unknown> = {
        externalId: result.externalId ?? null,
        url: result.url ?? null,
        metadata: result.metadata ?? {},
      };
      await this.chainRepo.updateStep(stepRow.id, {
        status: 'SUCCEEDED',
        resolvedPayload: payload as Prisma.InputJsonValue,
        output: output as Prisma.InputJsonValue,
        finishedAt: new Date(),
      });
      return { ok: true, output };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown adapter error';
      return fail(message);
    }
  }

  private async buildRunView(runId: string): Promise<ChainRunView> {
    const run = await this.chainRepo.findRunWithSteps(runId);
    if (run === null) {
      throw new BusinessException(
        'workspace.chain.run_not_found',
        'NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      id: run.id,
      chainId: run.chainId,
      status: run.status,
      error: run.error,
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null,
      steps: run.steps.map((s) => ({
        stepId: s.stepId,
        stepIndex: s.stepIndex,
        connectorId: s.connectorId,
        actionType: s.actionType,
        status: s.status,
        resolvedPayload: (s.resolvedPayload as Record<string, unknown> | null) ?? null,
        output: (s.output as Record<string, unknown> | null) ?? null,
        error: s.error,
      })),
    };
  }
}
