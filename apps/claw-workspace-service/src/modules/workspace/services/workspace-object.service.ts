import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { WorkspaceObjectRepository } from '../repositories/workspace-object.repository';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import type { ListWorkspaceObjectsQueryDto } from '../dto/list-workspace-objects-query.dto';
import type { PaginatedWorkspaceObjects, WorkspaceObjectWithLinks } from '../types/workspace.types';

@Injectable()
export class WorkspaceObjectService {
  constructor(
    private readonly objectRepository: WorkspaceObjectRepository,
    private readonly connectorRepository: WorkspaceConnectorRepository,
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
}
