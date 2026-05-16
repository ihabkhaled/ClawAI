import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { ConnectorAction } from '../../connector-access/enums/connector-action.enum';
import { ConnectorAccessService } from '../../connector-access/services/connector-access.service';
import { WorkspaceObjectRepository } from '../repositories/workspace-object.repository';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../adapters/workspace-adapter.factory';
import { OAuthTokenManager } from '../managers/oauth-token.manager';
import type { ListWorkspaceObjectsQueryDto } from '../dto/list-workspace-objects-query.dto';
import type {
  Prisma,
  WorkspaceHealthEvent,
  WorkspaceObject,
  WorkspaceSyncRun,
} from '../../../generated/prisma';
import type {
  FileContentStream,
  LiveObjectDetails,
  PaginatedWorkspaceObjects,
  WorkspaceObjectWithLinks,
} from '../types/workspace.types';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

@Injectable()
export class WorkspaceObjectService {
  private readonly logger = new Logger(WorkspaceObjectService.name);

  constructor(
    private readonly objectRepository: WorkspaceObjectRepository,
    private readonly connectorRepository: WorkspaceConnectorRepository,
    private readonly adapterFactory: WorkspaceAdapterFactory,
    private readonly tokenManager: OAuthTokenManager,
    private readonly accessService: ConnectorAccessService,
  ) {}

  async listObjects(
    userId: string,
    query: ListWorkspaceObjectsQueryDto,
  ): Promise<PaginatedWorkspaceObjects> {
    if (query.connectorId !== undefined) {
      const connector = await this.connectorRepository.findById(query.connectorId);
      if (connector === null) {
        throw new EntityNotFoundException('WorkspaceConnector', query.connectorId);
      }
      // v3 round 8 — viewing objects is gated by VIEW access (owner +
      // any grant tier passes). For granted users the repo call drops
      // the userId filter because the access service has already
      // authorized the read.
      const canView = await this.accessService.can(userId, connector.id, ConnectorAction.VIEW);
      if (!canView) {
        throw new BusinessException(
          'workspace.connector.forbidden',
          'FORBIDDEN',
          HttpStatus.FORBIDDEN,
        );
      }
      const isOwner = connector.userId === userId;
      if (isOwner) {
        return this.objectRepository.findByConnectorId(
          query.connectorId,
          userId,
          query.page,
          query.limit,
          query.type,
        );
      }
      return this.objectRepository.findByConnectorIdForAuthorizedUser(
        query.connectorId,
        query.page,
        query.limit,
        query.type,
      );
    }
    return this.objectRepository.findAllByUserId(userId, query.page, query.limit, query.type);
  }

  async getObject(id: string, userId: string): Promise<WorkspaceObjectWithLinks> {
    const obj = await this.objectRepository.findById(id, userId);
    if (obj === null) {
      throw new EntityNotFoundException('WorkspaceObject', id);
    }
    return obj as WorkspaceObjectWithLinks;
  }

  /**
   * Re-fetch the object from the upstream provider and upsert into DB.
   * Requires the owning connector to still be connected.
   */
  async refreshObject(id: string, userId: string): Promise<WorkspaceObject> {
    const obj = await this.loadOwnedObject(id, userId);
    const connector = await this.loadConnectedConnector(obj.connectorId);
    const live = await this.fetchLiveDetails(connector, obj);
    return this.objectRepository.upsert(connector.id, userId, connector.provider, {
      connector: { connect: { id: connector.id } },
      userId,
      externalId: live.externalId,
      type: obj.type,
      title: live.title ?? obj.title,
      content: live.content ?? undefined,
      url: live.url ?? undefined,
      authorId: live.authorId ?? undefined,
      provider: connector.provider as WorkspaceProvider,
      metadata: live.metadata as Prisma.InputJsonValue,
      externalCreatedAt: live.externalCreatedAt ?? undefined,
      externalUpdatedAt: live.externalUpdatedAt ?? undefined,
    });
  }

  private async loadOwnedObject(id: string, userId: string): Promise<WorkspaceObject> {
    const obj = await this.objectRepository.findById(id, userId);
    if (obj === null) {
      throw new EntityNotFoundException('WorkspaceObject', id);
    }
    return obj;
  }

  // v3 round 11 (Prompt 08) — stream a file-backed object's raw bytes
  // from the provider. Authorizes via ConnectorAccessService (VIEW) so
  // both the owner and any grantee can download. Returns the
  // FileContentStream descriptor — the controller pipes `body` straight
  // to the HTTP response.
  async downloadObjectContent(id: string, userId: string): Promise<FileContentStream> {
    const obj = await this.objectRepository.findByIdForAuthorizedUser(id);
    if (obj === null) {
      throw new EntityNotFoundException('WorkspaceObject', id);
    }
    const canView = await this.accessService.can(
      userId,
      obj.connectorId,
      ConnectorAction.VIEW,
    );
    if (!canView) {
      throw new BusinessException(
        'workspace.connector.forbidden',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
    const connector = await this.loadConnectedConnector(obj.connectorId);
    const adapter = this.adapterFactory.getAdapter(connector.provider as WorkspaceProvider);
    if (adapter.downloadFileContent === undefined) {
      throw new BusinessException(
        'workspace.object.download.unsupported',
        'ADAPTER_DOWNLOAD_UNSUPPORTED',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    const tokens = this.tokenManager.decryptTokenSet(connector.encryptedTokens);
    const stream = await adapter.downloadFileContent(
      tokens.accessToken,
      obj.externalId,
      (obj.metadata ?? {}) as Record<string, unknown>,
    );
    if (stream === null) {
      this.logger.warn(`Object ${obj.id} content gone upstream (${obj.externalId})`);
      throw new BusinessException(
        'workspace.object.download.gone',
        'OBJECT_GONE',
        HttpStatus.GONE,
      );
    }
    return stream;
  }

  private async loadConnectedConnector(
    connectorId: string,
  ): Promise<{ id: string; provider: string; encryptedTokens: string }> {
    const connector = await this.connectorRepository.findById(connectorId);
    if (connector === null) {
      throw new EntityNotFoundException('WorkspaceConnector', connectorId);
    }
    if (connector.encryptedTokens === null) {
      throw new BusinessException(
        'workspace.object.refresh.no_tokens',
        'NO_TOKENS',
        HttpStatus.BAD_REQUEST,
      );
    }
    return {
      id: connector.id,
      provider: connector.provider,
      encryptedTokens: connector.encryptedTokens,
    };
  }

  private async fetchLiveDetails(
    connector: { provider: string; encryptedTokens: string },
    obj: WorkspaceObject,
  ): Promise<LiveObjectDetails> {
    const tokens = this.tokenManager.decryptTokenSet(connector.encryptedTokens);
    const adapter = this.adapterFactory.getAdapter(connector.provider as WorkspaceProvider);
    if (adapter.fetchObjectDetails === undefined) {
      throw new BusinessException(
        'workspace.object.refresh.unsupported',
        'ADAPTER_REFRESH_UNSUPPORTED',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    const live = await adapter.fetchObjectDetails(
      tokens.accessToken,
      obj.externalId,
      obj.type,
      (obj.metadata ?? {}) as Record<string, unknown>,
    );
    if (live === null) {
      this.logger.warn(`Object ${obj.id} no longer exists upstream (${obj.externalId})`);
      throw new BusinessException('workspace.object.refresh.gone', 'OBJECT_GONE', HttpStatus.GONE);
    }
    return live;
  }

  /** Recent sync runs for a connector. */
  async listSyncRuns(
    connectorId: string,
    userId: string,
    limit: number,
  ): Promise<WorkspaceSyncRun[]> {
    await this.assertOwnedConnector(connectorId, userId);
    return this.connectorRepository.findSyncRunsByConnectorId(connectorId, limit);
  }

  /** Recent health events for a connector. */
  async listHealthEvents(
    connectorId: string,
    userId: string,
    limit: number,
  ): Promise<WorkspaceHealthEvent[]> {
    await this.assertOwnedConnector(connectorId, userId);
    return this.connectorRepository.findHealthEventsByConnectorId(connectorId, limit);
  }

  private async assertOwnedConnector(connectorId: string, userId: string): Promise<void> {
    // v3 round 8 — renamed for honesty: this no longer asserts ownership,
    // it asserts VIEW access (owner or any grant level). The legacy name
    // is preserved so call sites don't churn. Sync-triggering helpers
    // remain owner-only via WorkspaceConnectorService's ad-hoc check.
    const connector = await this.connectorRepository.findById(connectorId);
    if (connector === null) {
      throw new EntityNotFoundException('WorkspaceConnector', connectorId);
    }
    const canView = await this.accessService.can(userId, connectorId, ConnectorAction.VIEW);
    if (!canView) {
      throw new BusinessException(
        'workspace.connector.forbidden',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
