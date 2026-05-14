import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { ConnectorAction } from '../../connector-access/enums/connector-action.enum';
import { ConnectorAccessService } from '../../connector-access/services/connector-access.service';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { FigmaAdapter } from '../adapters/figma.adapter';
import { TokenRefreshManager } from '../managers/token-refresh.manager';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import type { FigmaDesignAnalysis } from '../types/figma-api.types';

// v3 round 10 (2026-05-14) — Prompt 09: Figma design analysis pipeline.
// Connector-scoped wrapper around FigmaAdapter.analyzeDesign — resolves
// the connector, checks VIEW access via the RBAC service, gets a fresh
// token, and returns the AI-ready design summary.
@Injectable()
export class FigmaDesignService {
  private readonly logger = new Logger(FigmaDesignService.name);

  constructor(
    private readonly connectorRepository: WorkspaceConnectorRepository,
    private readonly tokenRefresh: TokenRefreshManager,
    private readonly figmaAdapter: FigmaAdapter,
    private readonly accessService: ConnectorAccessService,
  ) {}

  async analyze(
    userId: string,
    connectorId: string,
    fileKey: string,
  ): Promise<FigmaDesignAnalysis> {
    const connector = await this.connectorRepository.findById(connectorId);
    if (connector === null) {
      throw new EntityNotFoundException('WorkspaceConnector', connectorId);
    }
    if (connector.provider !== WorkspaceProvider.FIGMA) {
      throw new BusinessException(
        'workspace.figma.wrong_provider',
        'WRONG_PROVIDER',
        HttpStatus.BAD_REQUEST,
      );
    }
    const canView = await this.accessService.can(userId, connectorId, ConnectorAction.VIEW);
    if (!canView) {
      throw new BusinessException(
        'workspace.connector.forbidden',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
    const accessToken = await this.tokenRefresh.getValidAccessToken(connector);
    if (accessToken === null || accessToken.length === 0) {
      throw new BusinessException(
        'workspace.figma.no_token',
        'NO_VALID_TOKEN',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.logger.debug(`analyze: connectorId=${connectorId} fileKey=${fileKey}`);
    return this.figmaAdapter.analyzeDesign(accessToken, fileKey);
  }
}
