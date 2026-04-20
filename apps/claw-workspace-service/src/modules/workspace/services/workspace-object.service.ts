import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { WorkspaceObjectRepository } from '../repositories/workspace-object.repository';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import { WorkspaceAdapterFactory } from '../adapters/workspace-adapter.factory';
import { OAuthTokenManager } from '../managers/oauth-token.manager';
import type { ListWorkspaceObjectsQueryDto } from '../dto/list-workspace-objects-query.dto';
import type { Prisma, WorkspaceObject, WorkspaceSyncRun } from '../../../generated/prisma';
import type {
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
      if (connector.userId !== userId) {
        throw new BusinessException(
          'workspace.connector.forbidden',
          'FORBIDDEN',
          HttpStatus.FORBIDDEN,
        );
      }
      return this.objectRepository.findByConnectorId(
        query.connectorId,
        userId,
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
    const connector = await this.connectorRepository.findById(connectorId);
    if (connector === null) {
      throw new EntityNotFoundException('WorkspaceConnector', connectorId);
    }
    if (connector.userId !== userId) {
      throw new BusinessException(
        'workspace.connector.forbidden',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.connectorRepository.findSyncRunsByConnectorId(connectorId, limit);
  }
}
