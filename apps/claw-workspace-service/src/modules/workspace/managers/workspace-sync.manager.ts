import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  EventPattern,
  type WorkspaceSyncDlqSentPayload,
  type WorkspaceSyncErrorClass,
  type WorkspaceSyncRunCompletedPayload,
  type WorkspaceSyncRunFailedPayload,
  type WorkspaceSyncRunStartedPayload,
  type WorkspaceSyncTriggeredBy,
} from '@claw/shared-types';

import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../adapters/workspace-adapter.factory';
import { WorkspaceSyncEventBridgeService } from '../../workspace-events/services/workspace-sync-event-bridge.service';
import { TokenRefreshManager } from './token-refresh.manager';
import { WorkspaceObjectManager } from './workspace-object.manager';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceSyncStatus } from '../../../common/enums/workspace-sync-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { AppConfig } from '../../../app/config/app.config';
import { computeBackoffMs, shouldRetry } from '../../../common/utilities/retry-policy.utility';
import {
  DEFAULT_SYNC_RUN_OPTIONS,
  SYNC_DLQ_ROUTING_KEY_PREFIX,
} from '../constants/sync-cadence.constants';
import type { RequiredSyncRunOptions, SyncRunOptions } from '../types/sync-run-options.types';
import type { SyncResult } from '../types/workspace.types';
import type { WorkspaceConnector } from '../../../generated/prisma';

@Injectable()
export class WorkspaceSyncManager {
  private readonly logger = new Logger(WorkspaceSyncManager.name);

  constructor(
    private readonly repository: WorkspaceConnectorRepository,
    private readonly adapterFactory: WorkspaceAdapterFactory,
    private readonly tokenRefresh: TokenRefreshManager,
    private readonly objectManager: WorkspaceObjectManager,
    private readonly rabbitmq: RabbitMQService,
    private readonly syncEventBridge: WorkspaceSyncEventBridgeService,
  ) {}

  async syncConnector(
    connector: WorkspaceConnector,
    isDelta: boolean,
    rawOptions: SyncRunOptions = {},
  ): Promise<SyncResult> {
    const options: RequiredSyncRunOptions = { ...DEFAULT_SYNC_RUN_OPTIONS, ...rawOptions };
    const startedAt = new Date();
    const cursorIn = isDelta ? (connector.deltaToken ?? null) : null;

    const syncRun = await this.openSyncRun(connector, isDelta, cursorIn, startedAt, options);
    await this.emitRunStarted(connector, syncRun.id, cursorIn, isDelta, options);

    let runClosed = false;
    try {
      const retryOutcome = await this.runWithRetry(connector, isDelta, cursorIn);
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      const upsertedCount = await this.upsertIfSucceeded(connector, retryOutcome, options);
      await this.closeSyncRun(syncRun.id, retryOutcome, upsertedCount, completedAt, durationMs);
      runClosed = true;
      await this.emitLifecycleOutcome(
        connector,
        syncRun.id,
        retryOutcome,
        upsertedCount,
        startedAt,
        completedAt,
        durationMs,
        cursorIn,
        isDelta,
        options,
      );

      this.logOutcome(connector, retryOutcome, upsertedCount, durationMs);
      return retryOutcome.result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`syncConnector: unexpected failure for ${connector.id} — ${message}`);
      if (!runClosed) {
        await this.forceCloseOrphanRun(syncRun.id, message).catch((closeErr) => {
          this.logger.error(
            `syncConnector: failed to close orphan run ${syncRun.id} — ${String(closeErr)}`,
          );
        });
      }
      throw error;
    }
  }

  private async forceCloseOrphanRun(runId: string, message: string): Promise<void> {
    await this.repository.updateSyncRun(runId, {
      status: WorkspaceSyncStatus.FAILED,
      completedAt: new Date(),
      errorCode: 'SyncPipelineException',
      errorMessage: message.slice(0, 2000),
    });
  }

  private async openSyncRun(
    connector: WorkspaceConnector,
    isDelta: boolean,
    cursorIn: string | null,
    startedAt: Date,
    options: RequiredSyncRunOptions,
  ): Promise<{ id: string }> {
    const objectType = this.deriveDefaultObjectType(connector.provider as WorkspaceProvider);
    return this.repository.createSyncRun({
      connector: { connect: { id: connector.id } },
      status: WorkspaceSyncStatus.RUNNING,
      objectType,
      isDelta,
      deltaTokenIn: cursorIn ?? undefined,
      cursorBefore: cursorIn,
      isDryRun: options.isDryRun,
      triggeredBy: options.triggeredBy,
      runKey: options.runKey.length > 0 ? options.runKey : undefined,
      startedAt,
    });
  }

  private async upsertIfSucceeded(
    connector: WorkspaceConnector,
    outcome: { result: SyncResult },
    options: RequiredSyncRunOptions,
  ): Promise<number> {
    if (
      outcome.result.objects.length === 0 ||
      outcome.result.errorMessage !== undefined ||
      options.isDryRun
    ) {
      return 0;
    }
    const synced = await this.objectManager.upsertBatch(
      connector.id,
      connector.userId,
      connector.provider,
      outcome.result.objects,
    );
    // Phase 04 (scoped slice) — the "consistency path": bridge synced
    // objects into the canonical WorkspaceEvent fabric for providers with
    // no webhook fast path. No-ops for webhook-covered providers (see
    // WorkspaceSyncEventBridgeService) so this never duplicates events the
    // webhook path already created.
    // Prisma's generated WorkspaceProvider enum and the hand-written
    // common/enums mirror are structurally identical string enums but
    // nominally distinct types; bridging them with a plain cast matches
    // the existing convention in workspace-provider-registry.controller.ts.
    await this.syncEventBridge
      .bridge(connector.provider as WorkspaceProvider, connector.id, outcome.result.objects)
      .catch((error: unknown) => {
        this.logger.warn(
          `sync-event-bridge failed for connector ${connector.id} — ${error instanceof Error ? error.message : 'unknown'}`,
        );
      });
    return synced;
  }

  private async closeSyncRun(
    runId: string,
    outcome: { result: SyncResult; attempts: number; errorClass: WorkspaceSyncErrorClass | null },
    upsertedCount: number,
    completedAt: Date,
    durationMs: number,
  ): Promise<void> {
    const succeeded = outcome.result.errorMessage === undefined;
    await this.repository.updateSyncRun(runId, {
      status: succeeded ? WorkspaceSyncStatus.COMPLETED : WorkspaceSyncStatus.FAILED,
      objectsFound: outcome.result.objectsFound,
      objectsSynced: upsertedCount > 0 ? upsertedCount : outcome.result.objectsSynced,
      objectsFailed: outcome.result.objectsFailed,
      deltaTokenOut: outcome.result.deltaTokenOut,
      cursorAfter: outcome.result.deltaTokenOut ?? null,
      completedAt,
      durationMs,
      retryCount: outcome.attempts,
      errorCode: succeeded ? null : (outcome.errorClass ?? 'UnknownException'),
      errorMessage: outcome.result.errorMessage,
    });
  }

  private async emitLifecycleOutcome(
    connector: WorkspaceConnector,
    runId: string,
    outcome: { result: SyncResult; attempts: number; errorClass: WorkspaceSyncErrorClass | null },
    upsertedCount: number,
    startedAt: Date,
    completedAt: Date,
    durationMs: number,
    cursorIn: string | null,
    isDelta: boolean,
    options: RequiredSyncRunOptions,
  ): Promise<void> {
    const succeeded = outcome.result.errorMessage === undefined;
    if (succeeded && !options.isDryRun) {
      await this.persistSuccessfulSync(connector, outcome.result);
      await this.emitRunCompleted(connector, runId, startedAt, completedAt, {
        durationMs,
        cursorIn,
        cursorOut: outcome.result.deltaTokenOut ?? null,
        objectsFound: outcome.result.objectsFound,
        objectsSynced: upsertedCount > 0 ? upsertedCount : outcome.result.objectsSynced,
        objectsFailed: outcome.result.objectsFailed,
        retryCount: outcome.attempts,
        triggeredBy: options.triggeredBy,
      });
      await this.emitObjectSyncedLegacyEvent(connector, upsertedCount, isDelta);
      return;
    }
    if (!succeeded) {
      await this.emitRunFailed(connector, runId, startedAt, completedAt, {
        durationMs,
        retryCount: outcome.attempts,
        errorClass: outcome.errorClass ?? 'UnknownException',
        errorMessage: outcome.result.errorMessage ?? 'unknown',
        triggeredBy: options.triggeredBy,
      });
      await this.publishToDeadLetter(connector, runId, outcome.attempts, outcome.errorClass);
    }
  }

  private logOutcome(
    connector: WorkspaceConnector,
    outcome: { result: SyncResult; attempts: number },
    upsertedCount: number,
    durationMs: number,
  ): void {
    const succeeded = outcome.result.errorMessage === undefined;
    this.logger.log(
      `Sync ${succeeded ? 'completed' : 'failed'} for ${connector.id}: ` +
        `${upsertedCount}/${outcome.result.objectsFound} objects, ${outcome.attempts} attempt(s), ${durationMs}ms`,
    );
  }

  private async runWithRetry(
    connector: WorkspaceConnector,
    isDelta: boolean,
    cursorIn: string | null,
  ): Promise<{
    result: SyncResult;
    attempts: number;
    errorClass: WorkspaceSyncErrorClass | null;
  }> {
    const cfg = AppConfig.get();
    const retryConfig = {
      baseMs: cfg.WORKSPACE_SYNC_RETRY_BASE_MS,
      jitterMs: cfg.WORKSPACE_SYNC_RETRY_JITTER_MS,
      maxAttempts: cfg.WORKSPACE_SYNC_RETRY_MAX_ATTEMPTS,
    };

    const adapter = this.adapterFactory.getAdapter(connector.provider);
    const accessToken = (await this.tokenRefresh.getValidAccessToken(connector)) ?? '';
    const deltaToken = isDelta ? (cursorIn ?? undefined) : undefined;

    let lastError: unknown;
    let lastErrorClass: WorkspaceSyncErrorClass | null = null;
    let attempts = 0;

    for (let attempt = 0; attempt < retryConfig.maxAttempts; attempt += 1) {
      attempts = attempt + 1;
      try {
        const connectorMeta = (connector.metadata as Record<string, unknown> | null) ?? {};
        const result = await adapter.syncObjects(accessToken, deltaToken, connectorMeta);
        return { result, attempts, errorClass: null };
      } catch (error) {
        lastError = error;
        lastErrorClass = this.classifyError(error);
        this.logger.warn(
          `Sync attempt ${attempts}/${retryConfig.maxAttempts} failed for ${connector.id} (${lastErrorClass})`,
        );
        if (shouldRetry(attempts, retryConfig)) {
          const delay = computeBackoffMs(attempt, retryConfig);
          await this.delay(delay);
        }
      }
    }

    const errorMessage =
      lastError instanceof Error ? lastError.message : 'Sync failed after retries';
    return {
      result: {
        objectsFound: 0,
        objectsSynced: 0,
        objectsFailed: 0,
        errorMessage,
        objects: [],
      },
      attempts,
      errorClass: lastErrorClass,
    };
  }

  private classifyError(error: unknown): WorkspaceSyncErrorClass {
    if (error === null || error === undefined) {
      return 'UnknownException';
    }
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes('401') || message.includes('unauthorized') || message.includes('token')) {
      return 'OAuthExpiredException';
    }
    if (message.includes('429') || message.includes('rate') || message.includes('throttl')) {
      return 'RateLimitedException';
    }
    if (message.includes('5') && /50[0-9]/.test(message)) {
      return 'ProviderUnavailableException';
    }
    return 'AdapterException';
  }

  private async persistSuccessfulSync(
    connector: WorkspaceConnector,
    result: SyncResult,
  ): Promise<void> {
    const objectCount = await this.repository.getObjectCount(connector.id);
    const patch = {
      lastSyncAt: new Date(),
      objectCount,
      status: WorkspaceConnectorStatus.CONNECTED,
      statusReason: null,
      ...(result.deltaTokenOut !== undefined ? { deltaToken: result.deltaTokenOut } : {}),
    };
    await this.repository.update(connector.id, patch);
  }

  private async emitRunStarted(
    connector: WorkspaceConnector,
    runId: string,
    cursorIn: string | null,
    isDelta: boolean,
    options: RequiredSyncRunOptions,
  ): Promise<void> {
    const payload: WorkspaceSyncRunStartedPayload = {
      connectorId: connector.id,
      provider: connector.provider as WorkspaceProvider,
      userId: connector.userId,
      runId,
      isDelta,
      isDryRun: options.isDryRun,
      cursorIn,
      triggeredBy: options.triggeredBy,
      actorUserId: options.actorUserId,
      timestamp: new Date().toISOString(),
    };
    await this.rabbitmq.publish(EventPattern.WORKSPACE_SYNC_RUN_STARTED, payload);
  }

  private async emitRunCompleted(
    connector: WorkspaceConnector,
    runId: string,
    startedAt: Date,
    completedAt: Date,
    summary: {
      durationMs: number;
      cursorIn: string | null;
      cursorOut: string | null;
      objectsFound: number;
      objectsSynced: number;
      objectsFailed: number;
      retryCount: number;
      triggeredBy: WorkspaceSyncTriggeredBy;
    },
  ): Promise<void> {
    const payload: WorkspaceSyncRunCompletedPayload = {
      connectorId: connector.id,
      provider: connector.provider as WorkspaceProvider,
      userId: connector.userId,
      runId,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: summary.durationMs,
      cursorIn: summary.cursorIn,
      cursorOut: summary.cursorOut,
      objectsFound: summary.objectsFound,
      objectsSynced: summary.objectsSynced,
      objectsFailed: summary.objectsFailed,
      retryCount: summary.retryCount,
      triggeredBy: summary.triggeredBy,
      timestamp: completedAt.toISOString(),
    };
    await this.rabbitmq.publish(EventPattern.WORKSPACE_SYNC_RUN_COMPLETED, payload);
  }

  private async emitRunFailed(
    connector: WorkspaceConnector,
    runId: string,
    startedAt: Date,
    failedAt: Date,
    summary: {
      durationMs: number;
      retryCount: number;
      errorClass: WorkspaceSyncErrorClass;
      errorMessage: string;
      triggeredBy: WorkspaceSyncTriggeredBy;
    },
  ): Promise<void> {
    const payload: WorkspaceSyncRunFailedPayload = {
      connectorId: connector.id,
      provider: connector.provider as WorkspaceProvider,
      userId: connector.userId,
      runId,
      startedAt: startedAt.toISOString(),
      failedAt: failedAt.toISOString(),
      durationMs: summary.durationMs,
      retryCount: summary.retryCount,
      terminal: true,
      errorClass: summary.errorClass,
      errorMessage: summary.errorMessage.slice(0, 2000),
      dlqPublished: true,
      triggeredBy: summary.triggeredBy,
      timestamp: failedAt.toISOString(),
    };
    await this.rabbitmq.publish(EventPattern.WORKSPACE_SYNC_RUN_FAILED, payload);
  }

  private async publishToDeadLetter(
    connector: WorkspaceConnector,
    runId: string,
    attempts: number,
    errorClass: WorkspaceSyncErrorClass | null,
  ): Promise<void> {
    const cfg = AppConfig.get();
    const routingKey = `${cfg.WORKSPACE_SYNC_DLQ_ROUTING_PREFIX}.${connector.provider.toLowerCase()}`;
    await this.rabbitmq.publish(routingKey, {
      connectorId: connector.id,
      provider: connector.provider,
      runId,
      errorClass: errorClass ?? 'UnknownException',
      attemptsConsumed: attempts,
      timestamp: new Date().toISOString(),
    });

    const audit: WorkspaceSyncDlqSentPayload = {
      connectorId: connector.id,
      provider: connector.provider as WorkspaceProvider,
      runId,
      queue: routingKey,
      errorClass: errorClass ?? 'UnknownException',
      attemptsConsumed: attempts,
      timestamp: new Date().toISOString(),
    };
    await this.rabbitmq.publish(EventPattern.WORKSPACE_SYNC_DLQ_SENT, audit);

    void (SYNC_DLQ_ROUTING_KEY_PREFIX ?? routingKey);
  }

  private async emitObjectSyncedLegacyEvent(
    connector: WorkspaceConnector,
    upsertedCount: number,
    isDelta: boolean,
  ): Promise<void> {
    await this.rabbitmq.publish(EventPattern.WORKSPACE_OBJECT_SYNCED, {
      connectorId: connector.id,
      provider: connector.provider,
      userId: connector.userId,
      objectCount: upsertedCount,
      deltaUsed: isDelta && connector.deltaToken !== null,
      timestamp: new Date().toISOString(),
    });
  }

  private deriveDefaultObjectType(provider: WorkspaceProvider): WorkspaceObjectType {
    // Phase 5 fix for Phase 1 audit finding: hardcoded REPOSITORY for all
    // providers. Default to the canonical object type per provider; the
    // adapter may still emit multiple object types within a single run.
    switch (provider) {
      case 'GITHUB':
      case 'GITLAB':
      case 'BITBUCKET':
        return WorkspaceObjectType.REPOSITORY;
      case 'SLACK':
        return WorkspaceObjectType.MESSAGE;
      case 'JIRA':
      case 'CLICKUP':
        return WorkspaceObjectType.TICKET;
      case 'CONFLUENCE':
        return WorkspaceObjectType.DOCUMENT;
      case 'FIGMA':
        return WorkspaceObjectType.FILE;
      case 'GOOGLE_DRIVE':
      case 'MICROSOFT_ONEDRIVE':
      case 'MICROSOFT_SHAREPOINT':
        return WorkspaceObjectType.FILE;
      case 'GMAIL':
        return WorkspaceObjectType.EMAIL;
      default:
        return WorkspaceObjectType.DOCUMENT;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
