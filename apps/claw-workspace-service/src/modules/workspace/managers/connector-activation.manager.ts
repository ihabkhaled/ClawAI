import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceSyncManager } from './workspace-sync.manager';
import type { WorkspaceConnectorCreatedPayload } from '../types/connector-activation.types';

/**
 * Subscribes to WORKSPACE_CONNECTOR_CREATED and enqueues a first sync so
 * the user gets immediate value after OAuth. Fire-and-forget: the sync
 * runs in the background and emits its own progress events; failures are
 * persisted as WorkspaceSyncRun rows (status=FAILED) so the UI can
 * display them even if the async task crashes.
 */
@Injectable()
export class ConnectorActivationManager implements OnModuleInit {
  private readonly logger = new Logger(ConnectorActivationManager.name);

  constructor(
    private readonly repository: WorkspaceConnectorRepository,
    private readonly syncManager: WorkspaceSyncManager,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMQ.subscribe(EventPattern.WORKSPACE_CONNECTOR_CREATED, async (data) => {
      await this.handleConnectorCreated(data);
    });
  }

  async handleConnectorCreated(data: unknown): Promise<void> {
    const payload = data as WorkspaceConnectorCreatedPayload | null;
    if (payload === null || typeof payload.connectorId !== 'string') {
      this.logger.warn('connector.created: malformed payload; ignoring');
      return;
    }

    const connector = await this.repository.findById(payload.connectorId);
    if (connector === null) {
      this.logger.warn(`connector.created: connector ${payload.connectorId} not found`);
      return;
    }

    if (connector.encryptedTokens === null) {
      this.logger.log(
        `connector.created: ${connector.id} has no tokens yet (PENDING_AUTH); skipping auto-sync`,
      );
      return;
    }

    this.logger.log(`connector.created: auto-syncing ${connector.id} (${connector.provider})`);
    void this.runFirstSync(connector.id);
  }

  private async runFirstSync(connectorId: string): Promise<void> {
    try {
      const connector = await this.repository.findById(connectorId);
      if (connector === null) {
        return;
      }
      await this.syncManager.syncConnector(connector, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`connector.created: first sync failed for ${connectorId} — ${message}`);
    }
  }
}
