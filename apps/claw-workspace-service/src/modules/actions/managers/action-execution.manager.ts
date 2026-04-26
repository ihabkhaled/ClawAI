import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceAdapterFactory } from '../../workspace/adapters/workspace-adapter.factory';
import { TokenRefreshManager } from '../../workspace/managers/token-refresh.manager';
import { WorkspaceConnectorRepository } from '../../workspace/repositories/workspace-connector.repository';
import type { WorkspaceActionWithConnector } from '../types/action.types';
import type { WriteActionResult } from '../../workspace/types/workspace.types';

@Injectable()
export class ActionExecutionManager {
  private readonly logger = new Logger(ActionExecutionManager.name);

  constructor(
    private readonly adapterFactory: WorkspaceAdapterFactory,
    private readonly tokenRefresh: TokenRefreshManager,
    private readonly connectorRepository: WorkspaceConnectorRepository,
  ) {}

  async execute(action: WorkspaceActionWithConnector): Promise<WriteActionResult> {
    const { connector } = action;
    const adapter = this.adapterFactory.getAdapter(connector.provider);

    if (adapter.supportsWrite?.() !== true) {
      return {
        success: false,
        errorMessage: `Provider ${connector.provider} does not support write actions`,
      };
    }

    const accessToken = await this.resolveAccessToken(action.connectorId);
    if (accessToken === null) {
      return { success: false, errorMessage: 'Could not resolve access token for connector' };
    }

    if (adapter.executeWriteAction === undefined) {
      return {
        success: false,
        errorMessage: `Provider ${connector.provider} has no executeWriteAction implementation`,
      };
    }
    try {
      return await adapter.executeWriteAction(
        accessToken,
        action.actionType,
        action.payload as Record<string, unknown>,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown execution error';
      this.logger.error(`Write action ${action.id} failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }

  private async resolveAccessToken(connectorId: string): Promise<string | null> {
    try {
      const connector = await this.connectorRepository.findById(connectorId);
      if (connector === null || connector.encryptedTokens === null) {
        return null;
      }
      return await this.tokenRefresh.getValidAccessToken(connector);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token resolution failed';
      this.logger.warn(`Token resolution failed for connector ${connectorId}: ${message}`);
      return null;
    }
  }
}
