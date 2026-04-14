import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../adapters/workspace-adapter.factory';
import { OAuthTokenManager } from './oauth-token.manager';
import { WorkspaceSyncStatus } from '../../../common/enums/workspace-sync-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import {
  SYNC_MAX_RETRIES,
  SYNC_RETRY_DELAY_MS,
} from '../../../common/constants/workspace.constants';
import type { SyncResult } from '../types/workspace.types';
import type { WorkspaceConnector } from '../../../generated/prisma';

@Injectable()
export class WorkspaceSyncManager {
  private readonly logger = new Logger(WorkspaceSyncManager.name);

  constructor(
    private readonly repository: WorkspaceConnectorRepository,
    private readonly adapterFactory: WorkspaceAdapterFactory,
    private readonly tokenManager: OAuthTokenManager,
  ) {}

  async syncConnector(connector: WorkspaceConnector, isDelta: boolean): Promise<SyncResult> {
    const objectType = WorkspaceObjectType.REPOSITORY;
    const syncRun = await this.repository.createSyncRun({
      connector: { connect: { id: connector.id } },
      status: WorkspaceSyncStatus.RUNNING,
      objectType,
      isDelta,
      deltaTokenIn: isDelta ? (connector.deltaToken ?? undefined) : undefined,
    });

    const result = await this.executeSyncWithRetry(connector, isDelta, syncRun.id);

    await this.repository.updateSyncRun(syncRun.id, {
      status: result.errorMessage ? WorkspaceSyncStatus.FAILED : WorkspaceSyncStatus.COMPLETED,
      objectsFound: result.objectsFound,
      objectsSynced: result.objectsSynced,
      objectsFailed: result.objectsFailed,
      deltaTokenOut: result.deltaTokenOut,
      completedAt: new Date(),
      errorMessage: result.errorMessage,
    });

    await (result.deltaTokenOut !== undefined
      ? this.repository.update(connector.id, {
          deltaToken: result.deltaTokenOut,
          lastSyncAt: new Date(),
        })
      : this.repository.update(connector.id, { lastSyncAt: new Date() }));

    this.logger.log(
      `Sync completed for ${connector.id}: ${result.objectsSynced}/${result.objectsFound} objects`,
    );
    return result;
  }

  private async executeSyncWithRetry(
    connector: WorkspaceConnector,
    isDelta: boolean,
    _runId: string,
  ): Promise<SyncResult> {
    const adapter = this.adapterFactory.getAdapter(connector.provider);
    const tokens = connector.encryptedTokens
      ? this.tokenManager.decryptTokenSet(connector.encryptedTokens)
      : null;
    const accessToken = tokens?.accessToken ?? '';
    const deltaToken = isDelta ? (connector.deltaToken ?? undefined) : undefined;

    let lastError: unknown;
    for (let attempt = 1; attempt <= SYNC_MAX_RETRIES; attempt++) {
      try {
        return await adapter.syncObjects(accessToken, deltaToken);
      } catch (error) {
        lastError = error;
        this.logger.warn(`Sync attempt ${attempt}/${SYNC_MAX_RETRIES} failed for ${connector.id}`);
        if (attempt < SYNC_MAX_RETRIES) {
          await this.delay(SYNC_RETRY_DELAY_MS * attempt);
        }
      }
    }

    const errorMessage =
      lastError instanceof Error ? lastError.message : 'Sync failed after retries';
    return { objectsFound: 0, objectsSynced: 0, objectsFailed: 0, errorMessage };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
