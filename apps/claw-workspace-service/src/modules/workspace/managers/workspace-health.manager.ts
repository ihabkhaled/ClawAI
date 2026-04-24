import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../adapters/workspace-adapter.factory';
import { TokenRefreshManager } from './token-refresh.manager';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import type { HealthCheckResult } from '../types/workspace.types';
import type { WorkspaceConnector } from '../../../generated/prisma';

@Injectable()
export class WorkspaceHealthManager {
  private readonly logger = new Logger(WorkspaceHealthManager.name);

  constructor(
    private readonly repository: WorkspaceConnectorRepository,
    private readonly adapterFactory: WorkspaceAdapterFactory,
    private readonly tokenRefresh: TokenRefreshManager,
  ) {}

  async checkHealth(connector: WorkspaceConnector): Promise<HealthCheckResult> {
    const adapter = this.adapterFactory.getAdapter(connector.provider);
    const accessToken = (await this.tokenRefresh.getValidAccessToken(connector)) ?? '';
    const result = await adapter.healthCheck(accessToken);

    await this.repository.createHealthEvent({
      connector: { connect: { id: connector.id } },
      status: result.status,
      latencyMs: result.latencyMs,
      errorMessage: result.errorMessage,
    });

    await this.repository.update(connector.id, { status: result.status });
    this.logger.log(`Health check for ${connector.id}: ${result.status} (${result.latencyMs}ms)`);

    return result;
  }

  buildUnhealthyResult(error: unknown): HealthCheckResult {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { status: WorkspaceConnectorStatus.DISCONNECTED, latencyMs: 0, errorMessage: message };
  }
}
